import "server-only";
import { and, asc, count, eq, inArray, isNull, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { adminUsers, auditLog, tasks } from "@/db/schema";
import { asRole, canAssignTasks, canSeeDepartmentTasks, departmentOf, DEPARTMENTS, receivesTasks, ROLE_LABEL, type Department, type StudioRole } from "../auth/roles";
import { notify } from "./notify";

// To-dos: a head (or an admin) gives a Director of Curriculum or a Product Officer a to-do with a deadline. Their
// department sees it, with who gave it and when it's due. When it is marked done, whoever gave it is notified.

export type TeamActor = { adminId: string; role: StudioRole; email: string };

async function nameOf(id: string) {
  const d = await db();
  const [u] = await d.select({ name: adminUsers.name }).from(adminUsers).where(eq(adminUsers.id, id));
  return u?.name ?? "Someone";
}

async function log(actor: TeamActor, action: string, taskId: string, details: Record<string, unknown> = {}) {
  const d = await db();
  await d.insert(auditLog).values({ actorEmail: actor.email, action, targetType: "task", targetId: taskId, details });
}

/** People who can receive to-dos: Directors of Curriculum and Product Officers (for the assign form). */
export async function assignableDirectors() {
  const d = await db();
  const rows = await d.select({ id: adminUsers.id, name: adminUsers.name, role: adminUsers.role, avatarKey: adminUsers.avatarKey }).from(adminUsers).where(eq(adminUsers.active, true)).orderBy(adminUsers.name);
  return rows.map((r) => ({ ...r, role: asRole(r.role) })).filter((r) => receivesTasks(r.role));
}

export async function assignTask(actor: TeamActor, input: { title: string; notes: string; assigneeId: string; dueAt: Date }) {
  if (!canAssignTasks(actor.role)) return { ok: false as const, error: "Only heads and admins assign to-dos." };
  const title = input.title.trim().slice(0, 200);
  if (title.length < 3) return { ok: false as const, error: "Describe the to-do (at least 3 characters)." };
  if (!(input.dueAt instanceof Date) || Number.isNaN(input.dueAt.getTime())) return { ok: false as const, error: "Choose a deadline." };
  if (input.dueAt.getTime() < Date.now() - 60_000) return { ok: false as const, error: "The deadline is in the past." };
  const d = await db();
  const [who] = await d.select().from(adminUsers).where(eq(adminUsers.id, input.assigneeId));
  const role = who && asRole(who.role);
  if (!who || !who.active || !role || !receivesTasks(role)) return { ok: false as const, error: "To-dos go to a Director of Curriculum or a Product Officer." };
  const department = departmentOf(role)!;
  const [row] = await d
    .insert(tasks)
    .values({ title, notes: input.notes.trim().slice(0, 2000), department, assigneeId: who.id, assignedById: actor.adminId, dueAt: input.dueAt })
    .returning();
  await log(actor, "task.assign", row.id, { title, to: who.username, due: input.dueAt.toISOString() });
  await notify([who.id], { kind: "task_assigned", title: `New to-do from ${await nameOf(actor.adminId)}`, body: title, link: `/admin/tasks#task-${row.id}` });
  return { ok: true as const, id: row.id, assignee: who.name };
}

async function taskOr(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const d = await db();
  const [t] = await d.select().from(tasks).where(eq(tasks.id, id));
  return t ?? null;
}

/** Whoever the to-do was given to marks it done (admins can too); whoever gave it is notified. */
export async function completeTask(actor: TeamActor, id: string) {
  const t = await taskOr(id);
  if (!t) return { ok: false as const, error: "That to-do no longer exists." };
  if (t.assigneeId !== actor.adminId && actor.role !== "admin") return { ok: false as const, error: "Only the person it was given to can mark it done." };
  if (t.status === "done") return { ok: true as const };
  const d = await db();
  await d.update(tasks).set({ status: "done", doneAt: new Date() }).where(eq(tasks.id, id));
  await log(actor, "task.done", id, { title: t.title });
  if (t.assignedById && t.assignedById !== actor.adminId) {
    const late = Date.now() > t.dueAt.getTime();
    await notify([t.assignedById], { kind: "task_done", title: `${await nameOf(actor.adminId)} finished a to-do`, body: `${t.title}${late ? " (after the deadline)" : ""}`, link: `/admin/tasks#task-${id}` });
  }
  return { ok: true as const };
}

/** Back to open (the director clicked done by mistake, or the head wants more). */
export async function reopenTask(actor: TeamActor, id: string) {
  const t = await taskOr(id);
  if (!t) return { ok: false as const, error: "That to-do no longer exists." };
  if (![t.assigneeId, t.assignedById].includes(actor.adminId) && actor.role !== "admin") return { ok: false as const, error: "You can't reopen that to-do." };
  const d = await db();
  await d.update(tasks).set({ status: "open", doneAt: null }).where(eq(tasks.id, id));
  await log(actor, "task.reopen", id, { title: t.title });
  return { ok: true as const };
}

/** Removes a to-do (whoever gave it, or an admin). */
export async function removeTask(actor: TeamActor, id: string) {
  const t = await taskOr(id);
  if (!t) return { ok: true as const };
  if (t.assignedById !== actor.adminId && actor.role !== "admin") return { ok: false as const, error: "Only whoever gave the to-do (or an admin) can delete it." };
  const d = await db();
  await d.delete(tasks).where(eq(tasks.id, id));
  await log(actor, "task.delete", id, { title: t.title });
  return { ok: true as const };
}

/** The to-dos this person may see: admins and heads see both departments; everyone else their own. */
export async function visibleTasks(actor: TeamActor) {
  const depts = DEPARTMENTS.filter((dep) => canSeeDepartmentTasks(actor.role, dep));
  if (!depts.length) return [];
  const d = await db();
  const assignee = alias(adminUsers, "assignee");
  const giver = alias(adminUsers, "giver");
  const rows = await d
    .select({ t: tasks, assigneeName: assignee.name, assigneeRole: assignee.role, assigneeAvatar: assignee.avatarKey, giverName: giver.name, giverRole: giver.role, giverAvatar: giver.avatarKey })
    .from(tasks)
    .innerJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(giver, eq(giver.id, tasks.assignedById))
    .orderBy(asc(tasks.dueAt));
  return rows
    .filter((r) => depts.includes(r.t.department as Department))
    .map((r) => ({
      ...r.t,
      department: r.t.department as Department,
      assignee: { id: r.t.assigneeId, name: r.assigneeName, role: ROLE_LABEL[asRole(r.assigneeRole)], avatarKey: r.assigneeAvatar },
      giver: r.t.assignedById ? { id: r.t.assignedById, name: r.giverName ?? "Former member", role: r.giverRole ? ROLE_LABEL[asRole(r.giverRole)] : "", avatarKey: r.giverAvatar } : null,
    }));
}

/** Deadline and state of to-dos by id (the Inbox shows them live, in the reader's own time zone). */
export async function taskStates(ids: string[]) {
  const ok = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (!ok.length) return new Map<string, { dueAt: Date; status: string }>();
  const d = await db();
  const rows = await d.select({ id: tasks.id, dueAt: tasks.dueAt, status: tasks.status }).from(tasks).where(inArray(tasks.id, ok));
  return new Map(rows.map((r) => [r.id, { dueAt: r.dueAt, status: r.status }]));
}

export async function myOpenTaskCount(adminId: string) {
  const d = await db();
  const [{ n }] = await d.select({ n: count() }).from(tasks).where(and(eq(tasks.assigneeId, adminId), eq(tasks.status, "open")));
  return n;
}

/** Daily: tells the person it was given to and whoever gave it, once, when an open to-do passes its deadline. */
export async function notifyOverdueTasks(now = new Date()) {
  const d = await db();
  const late = await d.select().from(tasks).where(and(eq(tasks.status, "open"), lt(tasks.dueAt, now), isNull(tasks.overdueNotifiedAt)));
  for (const t of late) {
    await notify([t.assigneeId, t.assignedById], { kind: "task_overdue", title: "A to-do is past its deadline", body: t.title, link: `/admin/tasks#task-${t.id}` });
    await d.update(tasks).set({ overdueNotifiedAt: now }).where(eq(tasks.id, t.id));
  }
  return late.length;
}
