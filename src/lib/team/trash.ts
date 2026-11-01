import "server-only";
import { desc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, auditLog, chatMessages, classAssignments, classes, contentItems, kits, kitVersions, trash } from "@/db/schema";
import { deleteStoredMedia, slugify } from "../cms";
import { deleteObject } from "../storage";
import { TRASH_DAYS } from "./chat";

// Recently deleted (admins only). Deleting a lesson, material, handout or manual in Studio moves it here: its rows
// are copied into the trash table and removed (teachers lose it at once), while its stored files stay in storage.
// An admin can restore it (same id and files) or delete it forever; after 30 days it is deleted forever automatically.

type ContentRow = typeof contentItems.$inferSelect;
type AssignmentRow = typeof classAssignments.$inferSelect;
type ContentPayload = { items: ContentRow[]; assignments: AssignmentRow[] };
type MessagePayload = { messageId: string };

export type TrashActor = { email?: string | null; adminId?: string | null };

const TYPE_LABEL: Record<string, string> = { instructions: "Lesson", interactive: "Interactive lesson", training: "Training", video: "Video", pdf: "File", manual: "Manual", lab: "Lab" };

async function whoName(actor: TrashActor) {
  if (!actor.adminId) return actor.email ?? "Studio";
  const d = await db();
  const [u] = await d.select({ name: adminUsers.name }).from(adminUsers).where(eq(adminUsers.id, actor.adminId));
  return u?.name ?? actor.email ?? "Studio";
}

async function audit(actor: TrashActor, action: string, targetId: string, details: Record<string, unknown>) {
  const d = await db();
  await d.insert(auditLog).values({ actorEmail: actor.email ?? null, action, targetType: "trash", targetId, details });
}

/** Moves a content item (and anything attached to it) to Recently deleted. */
export async function trashContent(actor: TrashActor, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const, error: "Not found." };
  const d = await db();
  const items = await d.select().from(contentItems).where(or(eq(contentItems.id, id), eq(contentItems.parentId, id)));
  const main = items.find((i) => i.id === id);
  if (!main) return { ok: false as const, error: "It was already deleted." };
  const assignments = await d.select().from(classAssignments).where(inArray(classAssignments.contentId, items.map((i) => i.id)));
  const [kit] = main.kitId ? await d.select({ name: kits.name }).from(kits).where(eq(kits.id, main.kitId)) : [];
  const [parent] = main.parentId ? await d.select({ title: contentItems.title }).from(contentItems).where(eq(contentItems.id, main.parentId)) : [];
  const extra = items.length - 1;
  const detail = [TYPE_LABEL[main.type] ?? "Item", kit?.name ?? "General", parent ? `in “${parent.title}”` : null, extra ? `with ${extra} material${extra === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
  const now = new Date();
  const name = await whoName(actor);
  const payload: ContentPayload = { items, assignments };
  const [row] = await d.transaction(async (tx) => {
    const r = await tx
      .insert(trash)
      .values({ kind: "content", title: main.title, detail, payload: payload as unknown as Record<string, unknown>, deletedById: actor.adminId ?? null, deletedByName: name, deletedAt: now, purgeAfter: new Date(now.getTime() + TRASH_DAYS * 86400_000) })
      .returning();
    await tx.delete(contentItems).where(inArray(contentItems.id, items.map((i) => i.id)));
    return r;
  });
  await audit(actor, "content.trash", id, { title: main.title, items: items.length });
  return { ok: true as const, trashId: row.id, title: main.title };
}

export async function listTrash() {
  const d = await db();
  return d.select({ id: trash.id, kind: trash.kind, title: trash.title, detail: trash.detail, deletedByName: trash.deletedByName, deletedAt: trash.deletedAt, purgeAfter: trash.purgeAfter }).from(trash).orderBy(desc(trash.deletedAt));
}

const revive = <T extends Record<string, unknown>>(row: T, keys: string[]) => {
  const out: Record<string, unknown> = { ...row };
  for (const k of keys) if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  return out as T;
};

/** Puts a deleted item back exactly as it was (same id, files and class assignments). */
export async function restoreTrash(actor: TrashActor, trashId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(trashId)) return { ok: false as const, error: "Not found." };
  const d = await db();
  const [t] = await d.select().from(trash).where(eq(trash.id, trashId));
  if (!t) return { ok: false as const, error: "It's no longer in Recently deleted." };

  if (t.kind === "message") {
    const { messageId } = t.payload as unknown as MessagePayload;
    const now = new Date();
    const back = await d.update(chatMessages).set({ deletedAt: null, updatedAt: now }).where(eq(chatMessages.id, messageId)).returning({ id: chatMessages.id });
    await d.delete(trash).where(eq(trash.id, t.id));
    if (!back.length) return { ok: false as const, error: "That message can't come back: its sender's account was removed." };
    await audit(actor, "chat.restore", messageId, { title: t.title });
    return { ok: true as const, title: t.title };
  }

  const payload = t.payload as unknown as ContentPayload;
  const items = payload.items.map((i) => revive(i, ["createdAt"]));
  const ids = new Set(items.map((i) => i.id));
  const [existingKits, existingVersions] = await Promise.all([d.select({ id: kits.id }).from(kits), d.select({ id: kitVersions.id }).from(kitVersions)]);
  const kitIds = new Set(existingKits.map((k) => k.id));
  const versionIds = new Set(existingVersions.map((v) => v.id));
  const parentIds = items.map((i) => i.parentId).filter((p): p is string => !!p && !ids.has(p));
  const liveParents = new Set(parentIds.length ? (await d.select({ id: contentItems.id }).from(contentItems).where(inArray(contentItems.id, parentIds))).map((r) => r.id) : []);
  if ((await d.select({ id: contentItems.id }).from(contentItems).where(inArray(contentItems.id, [...ids]))).length) return { ok: false as const, error: "It has already been restored." };
  const takenSlugs = new Set((await d.select({ slug: contentItems.slug }).from(contentItems)).map((r) => r.slug));
  const fixed = items.map((i) => {
    let slug = i.slug;
    for (let n = 2; takenSlugs.has(slug); n++) slug = `${slugify(i.slug)}-${n}`;
    takenSlugs.add(slug);
    return {
      ...i,
      slug,
      kitId: i.kitId && kitIds.has(i.kitId) ? i.kitId : null,
      kitVersionId: i.kitVersionId && versionIds.has(i.kitVersionId) ? i.kitVersionId : null,
      // A material whose lesson is gone for good comes back as a file of its own.
      parentId: i.parentId && (ids.has(i.parentId) || liveParents.has(i.parentId)) ? i.parentId : null,
    };
  });
  const classIds = [...new Set(payload.assignments.map((a) => a.classId))];
  const liveClasses = new Set(classIds.length ? (await d.select({ id: classes.id }).from(classes).where(inArray(classes.id, classIds))).map((c) => c.id) : []);
  const assignments = payload.assignments.filter((a) => liveClasses.has(a.classId)).map((a) => revive(a, ["createdAt"]));
  await d.transaction(async (tx) => {
    await tx.insert(contentItems).values(fixed);
    if (assignments.length) await tx.insert(classAssignments).values(assignments).onConflictDoNothing();
    await tx.delete(trash).where(eq(trash.id, t.id));
  });
  await audit(actor, "content.restore", items[0]?.id ?? t.id, { title: t.title });
  return { ok: true as const, title: t.title };
}

/** Deletes an item in Recently deleted forever, files included. */
export async function purgeTrash(actor: TrashActor, trashId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(trashId)) return { ok: false as const, error: "Not found." };
  const d = await db();
  const [t] = await d.delete(trash).where(eq(trash.id, trashId)).returning();
  if (!t) return { ok: true as const, title: "" };
  if (t.kind === "message") {
    const { messageId } = t.payload as unknown as MessagePayload;
    const [m] = await d.delete(chatMessages).where(eq(chatMessages.id, messageId)).returning();
    if (m?.fileKey) await deleteObject(m.fileKey).catch(() => {});
  } else {
    await Promise.all((t.payload as unknown as ContentPayload).items.map(deleteStoredMedia));
  }
  await audit(actor, "trash.purge", t.id, { title: t.title, kind: t.kind });
  return { ok: true as const, title: t.title };
}

/** Daily (and whenever Recently deleted is opened): deletes forever everything past its 30 days. */
export async function purgeExpiredTrash(now = new Date()) {
  const d = await db();
  const old = await d.select({ id: trash.id }).from(trash).where(lt(trash.purgeAfter, now));
  for (const t of old) await purgeTrash({ email: "automatic" }, t.id);
  return old.length;
}
