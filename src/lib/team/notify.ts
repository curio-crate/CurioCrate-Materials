import "server-only";
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, notifications } from "@/db/schema";
import { asRole, departmentOf, type Department } from "../auth/roles";

// Studio Inbox. Notifications are best-effort: a failure to notify never breaks the action that caused it.

export type NotificationKind = "task_assigned" | "task_done" | "task_overdue" | "kit_created" | "login" | "security";
export type NewNotification = { kind: NotificationKind; title: string; body?: string; link?: string | null };

export async function notify(recipientIds: (string | null | undefined)[], n: NewNotification) {
  const ids = [...new Set(recipientIds.filter((x): x is string => !!x))];
  if (!ids.length) return;
  try {
    const d = await db();
    await d.insert(notifications).values(ids.map((recipientId) => ({ recipientId, kind: n.kind, title: n.title.slice(0, 200), body: (n.body ?? "").slice(0, 600), link: n.link ?? null })));
  } catch (e) {
    console.error("notify failed", e);
  }
}

async function activeTeam() {
  const d = await db();
  return d.select({ id: adminUsers.id, role: adminUsers.role }).from(adminUsers).where(eq(adminUsers.active, true));
}

/** Active Admin accounts (sign-in and security notifications), optionally leaving one out. */
export async function adminIds(except?: string) {
  return (await activeTeam()).filter((u) => asRole(u.role) === "admin" && u.id !== except).map((u) => u.id);
}

/** Everyone active in a department (e.g. the whole curriculum department hears about a new kit). */
export async function departmentIds(dept: Department) {
  return (await activeTeam()).filter((u) => departmentOf(asRole(u.role)) === dept).map((u) => u.id);
}

/** Tells every admin about a security risk. */
export async function notifyAdminsOfRisk(title: string, body: string, link = "/admin/security") {
  await notify(await adminIds(), { kind: "security", title, body, link });
}

export async function listNotifications(adminId: string, limit = 60) {
  const d = await db();
  return d.select().from(notifications).where(eq(notifications.recipientId, adminId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadNotificationCount(adminId: string) {
  const d = await db();
  const [{ n }] = await d.select({ n: count() }).from(notifications).where(and(eq(notifications.recipientId, adminId), isNull(notifications.readAt)));
  return n;
}

/** Newest unread notifications after a point in time (for the toast that pops up when one arrives). */
export async function unreadSince(adminId: string, since: Date) {
  const d = await db();
  const rows = await d.select().from(notifications).where(and(eq(notifications.recipientId, adminId), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)).limit(5);
  return rows.filter((r) => r.createdAt > since);
}

/** Marks one (or, with no ids, every) notification of this person as read. */
export async function markNotificationsRead(adminId: string, ids?: string[]) {
  const d = await db();
  await d
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, adminId), isNull(notifications.readAt), ids?.length ? inArray(notifications.id, ids) : undefined));
}

export async function clearReadNotifications(adminId: string) {
  const d = await db();
  await d.delete(notifications).where(and(eq(notifications.recipientId, adminId), isNotNull(notifications.readAt)));
}
