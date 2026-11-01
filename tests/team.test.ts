import { eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { adminUsers, chatMessages, classAssignments, classes, contentItems, kits, trash } from "@/db/schema";
import { adminLogin, createAdmin, type CompanyAdmin } from "@/lib/auth/admin";
import { asRole, can, canAssignTasks, canSeeDepartmentTasks, departmentOf, STUDIO_ROLES } from "@/lib/auth/roles";
import { createFileItem, saveContent } from "@/lib/cms";
import { createKit } from "@/lib/kit-studio";
import { MEDIA_DIR, putObject } from "@/lib/storage";
import { channelMessages, deleteMessage, newChatKey, sendMessage, unreadByChannel } from "@/lib/team/chat";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/team/notify";
import { readAvatar, removeAvatar, setAvatar } from "@/lib/team/people";
import { dmChannel } from "@/lib/team/shared";
import { assignTask, completeTask, notifyOverdueTasks, visibleTasks } from "@/lib/team/tasks";
import { listTrash, purgeExpiredTrash, purgeTrash, restoreTrash, trashContent } from "@/lib/team/trash";
import { freshDb } from "./helpers/db";
import { makeTeacher } from "./helpers/factory";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3]);
const cleanup: string[] = [];

type Who = { adminId: string; role: ReturnType<typeof asRole>; email: string; id: string; username: string; name: string; sessionId: string };
const people: Record<string, Who> = {};

async function account(username: string): Promise<Who> {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(eq(adminUsers.username, username));
  return { adminId: u.id, id: u.id, role: asRole(u.role), email: u.username, username: u.username, name: u.name, sessionId: "test" };
}

beforeAll(async () => {
  await freshDb();
  expect((await adminLogin("CurioCrateAdmin", "WeLuvCurie@3322", "t1")).ok).toBe(true);
  people.owner = await account("CurioCrateAdmin");
  const add = async (key: string, role: string) => {
    const email = `${key}@curiocrate.org`;
    expect(await createAdmin(people.owner as CompanyAdmin, { email, name: key, role, password: "correct horse battery staple" })).toMatchObject({ ok: true });
    people[key] = await account(email);
  };
  await add("admin2", "admin");
  await add("headcur", "head_curriculum");
  await add("dircur", "director_curriculum");
  await add("headprod", "head_production");
  await add("po", "product");
});
afterAll(async () => {
  await Promise.all(cleanup.map((p) => fs.rm(path.join(MEDIA_DIR, p), { recursive: true, force: true })));
});

const inbox = async (who: Who) => listNotifications(who.adminId);

describe("roles and departments", () => {
  it("has exactly Admin, Head of Production, Product Officer, Head of Curriculum and Director of Curriculum", () => {
    expect(STUDIO_ROLES).toEqual(["admin", "head_production", "product", "head_curriculum", "director_curriculum"]);
    expect(departmentOf("head_curriculum")).toBe("curriculum");
    expect(departmentOf("director_curriculum")).toBe("curriculum");
    expect(departmentOf("head_production")).toBe("production");
    expect(departmentOf("product")).toBe("production");
    expect(departmentOf("admin")).toBeNull();
    expect(can("head_curriculum", "lessons") && can("director_curriculum", "library")).toBe(true);
    expect(can("head_production", "kits") && can("head_production", "codes") && can("product", "kits")).toBe(true);
    expect(["team", "trash", "erase", "security"].some((p) => can("head_production", p as never) || can("head_curriculum", p as never))).toBe(false);
    expect(can("admin", "trash") && !can("product", "trash")).toBe(true);
    expect(canAssignTasks("head_curriculum") && canAssignTasks("head_production") && canAssignTasks("admin")).toBe(true);
    expect(canAssignTasks("director_curriculum") || canAssignTasks("product")).toBe(false);
    expect(canSeeDepartmentTasks("product", "curriculum")).toBe(false);
    expect(canSeeDepartmentTasks("director_curriculum", "production")).toBe(false);
    expect(canSeeDepartmentTasks("head_production", "curriculum")).toBe(true);
  });
});

describe("to-dos", () => {
  it("heads give Directors of Curriculum and Product Officers to-dos; they're notified; done notifies the head", async () => {
    const due = new Date(Date.now() + 2 * 86400_000);
    expect(await assignTask(people.dircur, { title: "Nope", notes: "", assigneeId: people.po.id, dueAt: due })).toMatchObject({ ok: false });
    expect(await assignTask(people.po, { title: "Nope", notes: "", assigneeId: people.dircur.id, dueAt: due })).toMatchObject({ ok: false });
    expect(await assignTask(people.headcur, { title: "Write it", notes: "", assigneeId: people.headprod.id, dueAt: due })).toMatchObject({ ok: false, error: /Director of Curriculum or a Product Officer/ });
    expect(await assignTask(people.headcur, { title: "Late", notes: "", assigneeId: people.dircur.id, dueAt: new Date(Date.now() - 86400_000) })).toMatchObject({ ok: false, error: /past/ });

    const a = await assignTask(people.headcur, { title: "Finish the magnet manual", notes: "Chapter 2", assigneeId: people.dircur.id, dueAt: due });
    expect(a.ok).toBe(true);
    // Cross-department: the Head of Curriculum gives a Product Officer a to-do too.
    const b = await assignTask(people.headcur, { title: "Ship sample kits", notes: "", assigneeId: people.po.id, dueAt: due });
    expect(b.ok).toBe(true);

    expect((await inbox(people.dircur)).map((n) => n.kind)).toContain("task_assigned");
    expect((await inbox(people.dircur))[0].title).toMatch(/headcur/);

    // Who sees what: each department sees its own; heads and admins see both.
    const titles = async (w: Who) => (await visibleTasks(w)).map((t) => t.title).sort();
    expect(await titles(people.dircur)).toEqual(["Finish the magnet manual"]);
    expect(await titles(people.po)).toEqual(["Ship sample kits"]);
    expect(await titles(people.headprod)).toEqual(["Finish the magnet manual", "Ship sample kits"]);
    expect(await titles(people.owner)).toEqual(["Finish the magnet manual", "Ship sample kits"]);
    const seen = (await visibleTasks(people.dircur))[0];
    expect(seen.giver?.name).toBe("headcur");
    expect(seen.dueAt.getTime()).toBe(due.getTime());

    // Only the person it was given to (or an admin) marks it done; the head who gave it is notified.
    expect(await completeTask(people.po, a.ok ? a.id : "")).toMatchObject({ ok: false });
    expect(await completeTask(people.dircur, a.ok ? a.id : "")).toMatchObject({ ok: true });
    const headInbox = await inbox(people.headcur);
    expect(headInbox.find((n) => n.kind === "task_done")?.body).toBe("Finish the magnet manual");
  });

  it("an open to-do past its deadline notifies the person it was given to and the head once", async () => {
    const r = await assignTask(people.headprod, { title: "Count magnets", notes: "", assigneeId: people.po.id, dueAt: new Date(Date.now() + 60_000) });
    expect(r.ok).toBe(true);
    const later = new Date(Date.now() + 3600_000);
    expect(await notifyOverdueTasks(later)).toBe(1);
    expect(await notifyOverdueTasks(later)).toBe(0);
    expect((await inbox(people.headprod)).some((n) => n.kind === "task_overdue")).toBe(true);
    expect((await inbox(people.po)).some((n) => n.kind === "task_overdue" && n.body === "Count magnets")).toBe(true);
  });
});

describe("notifications", () => {
  it("a new kit notifies the whole curriculum department (and nobody else)", async () => {
    const r = await createKit({ teacherId: null, email: "po@curiocrate.org" }, { kind: "physical", name: "Optics Kit", code: "OPT", tagline: "Light", gradeMin: 6, gradeMax: 8 });
    expect(r.ok).toBe(true);
    for (const k of ["headcur", "dircur"]) expect((await inbox(people[k])).some((n) => n.kind === "kit_created" && n.title.includes("Optics Kit"))).toBe(true);
    for (const k of ["headprod", "po"]) expect((await inbox(people[k])).some((n) => n.kind === "kit_created")).toBe(false);
  });

  it("admins hear about sign-ins and security risks; others don't", async () => {
    expect((await adminLogin("dircur@curiocrate.org", "correct horse battery staple", "t2")).ok).toBe(true);
    expect((await inbox(people.owner)).some((n) => n.kind === "login" && n.title.includes("dircur"))).toBe(true);
    expect((await inbox(people.admin2)).some((n) => n.kind === "login" && n.title.includes("dircur"))).toBe(true);
    expect((await inbox(people.headcur)).some((n) => n.kind === "login")).toBe(false);

    for (let i = 0; i < 3; i++) await adminLogin("po@curiocrate.org", "wrong password!!", `t3-${i}`);
    expect((await inbox(people.owner)).some((n) => n.kind === "security" && n.title.includes("Wrong passwords for po"))).toBe(true);
    // New accounts and role changes are security notices too.
    expect((await inbox(people.admin2)).some((n) => n.kind === "security" && n.title.includes("New Studio account"))).toBe(true);
  });

  it("marks read one at a time or all at once", async () => {
    const before = await unreadNotificationCount(people.owner.adminId);
    expect(before).toBeGreaterThan(1);
    const [first] = await inbox(people.owner);
    await markNotificationsRead(people.owner.adminId, [first.id]);
    expect(await unreadNotificationCount(people.owner.adminId)).toBe(before - 1);
    await markNotificationsRead(people.owner.adminId);
    expect(await unreadNotificationCount(people.owner.adminId)).toBe(0);
  });
});

describe("chat", () => {
  it("department channels are open to everyone; private chats only to their two people", async () => {
    const sent = await sendMessage(people.po, { channel: "curriculum", body: "Production here: parts arrive Tuesday" });
    expect(sent.ok).toBe(true);
    const read = await channelMessages(people.dircur, "curriculum");
    expect(read.ok && read.messages.map((m) => m.body)).toContain("Production here: parts arrive Tuesday");

    const dm = dmChannel(people.headcur.id, people.dircur.id);
    expect((await sendMessage(people.headcur, { channel: dm, body: "Quick question" })).ok).toBe(true);
    expect((await channelMessages(people.dircur, dm)).ok).toBe(true);
    expect(await channelMessages(people.po, dm)).toMatchObject({ ok: false });
    expect(await sendMessage(people.po, { channel: dm, body: "sneaky" })).toMatchObject({ ok: false });
    expect(await sendMessage(people.po, { channel: "random", body: "x" })).toMatchObject({ ok: false });
    expect(await sendMessage(people.po, { channel: "all", body: "   " })).toMatchObject({ ok: false });
  });

  it("counts unread messages until the conversation is opened, and polls only changes", async () => {
    const dm = dmChannel(people.headcur.id, people.dircur.id);
    await new Promise((r) => setTimeout(r, 5));
    await sendMessage(people.headcur, { channel: dm, body: "Are you there?" });
    expect((await unreadByChannel(people.dircur.adminId))[dm]).toBe(1);
    expect((await unreadByChannel(people.headcur.adminId))[dm]).toBeUndefined(); // your own messages are never unread
    expect((await unreadByChannel(people.po.adminId))[dm]).toBeUndefined();
    const first = await channelMessages(people.dircur, dm);
    expect((await unreadByChannel(people.dircur.adminId))[dm]).toBeUndefined();

    await new Promise((r) => setTimeout(r, 5));
    await sendMessage(people.headcur, { channel: dm, body: "And another" });
    const next = await channelMessages(people.dircur, dm, first.ok ? new Date(first.now) : null);
    expect(next.ok && next.messages.map((m) => m.body)).toContain("And another");
  });

  it("sends files (images shown inline only when their bytes are an image)", async () => {
    const img = newChatKey("photo.png");
    const fake = newChatKey("fake.png");
    const doc = newChatKey("notes.pdf");
    cleanup.push("chat");
    await putObject(img, PNG, "image/png");
    await putObject(fake, new TextEncoder().encode("<svg onload=alert(1)>"), "image/png");
    await putObject(doc, new TextEncoder().encode("%PDF-1.4"), "application/pdf");
    const a = await sendMessage(people.po, { channel: "production", body: "", file: { key: img, name: "photo.png" } });
    const b = await sendMessage(people.po, { channel: "production", body: "", file: { key: fake, name: "fake.png" } });
    const c = await sendMessage(people.po, { channel: "production", body: "the notes", file: { key: doc, name: "notes.pdf" } });
    expect(a.ok && a.message.file?.isImage).toBe(true);
    expect(b.ok && b.message.file?.isImage).toBe(false);
    expect(c.ok && c.message.file).toMatchObject({ name: "notes.pdf", isImage: false });
    expect(await sendMessage(people.po, { channel: "production", body: "", file: { key: "uploads/file/2026-01/x.pdf", name: "x.pdf" } })).toMatchObject({ ok: false });
    expect(await sendMessage(people.po, { channel: "production", body: "", file: { key: newChatKey("never.pdf"), name: "never.pdf" } })).toMatchObject({ ok: false });
  });

  it("only the sender (or an admin) deletes a message; it goes to Recently deleted and can come back", async () => {
    const s = await sendMessage(people.dircur, { channel: "all", body: "Oops, wrong channel" });
    if (!s.ok) throw new Error(s.error);
    expect(await deleteMessage(people.po, s.message.id)).toMatchObject({ ok: false });
    expect(await deleteMessage(people.dircur, s.message.id)).toMatchObject({ ok: true });
    const after = await channelMessages(people.po, "all");
    expect(after.ok && after.messages.some((m) => m.id === s.message.id)).toBe(false);

    const item = (await listTrash()).find((t) => t.kind === "message" && t.title === "Oops, wrong channel");
    expect(item?.deletedByName).toBe("dircur");
    expect(await restoreTrash(people.owner, item!.id)).toMatchObject({ ok: true });
    const back = await channelMessages(people.po, "all");
    expect(back.ok && back.messages.some((m) => m.id === s.message.id)).toBe(true);

    await deleteMessage(people.owner, s.message.id);
    const again = (await listTrash()).find((t) => t.kind === "message" && t.title === "Oops, wrong channel")!;
    await purgeTrash(people.owner, again.id);
    const d = await db();
    expect(await d.select().from(chatMessages).where(eq(chatMessages.id, s.message.id))).toEqual([]);
  });
});

describe("Recently deleted (content)", () => {
  it("deleting a lesson keeps its files and class assignments until it is restored or purged", async () => {
    const d = await db();
    const [kit] = await d.select().from(kits).limit(1);
    const lesson = await saveContent({ teacherId: null, email: "x" }, null, { kitId: kit.id, parentId: null, type: "instructions", title: "Trash me lesson", summary: "", requiredTier: "kit_owner", section: null, minutes: null, ngss: [], bodyText: "Hello", captionsText: "", labSlug: null });
    const handout = await createFileItem({ teacherId: null, email: "x" }, { kitId: kit.id, parentId: lesson.id, requiredTier: "kit_owner", title: "Worksheet", summary: "" }, new File([new TextEncoder().encode("%PDF-1.4 worksheet")], "worksheet.pdf"));
    const [h] = await d.select().from(contentItems).where(eq(contentItems.id, handout.id));
    cleanup.push(h.fileKey!);
    const t = await makeTeacher();
    const [cls] = await d.insert(classes).values({ teacherId: t.id, orgId: t.orgId!, name: "P1", classCode: "TRASH1" }).returning();
    await d.insert(classAssignments).values({ classId: cls.id, contentId: lesson.id });

    const r = await trashContent({ email: "dircur@curiocrate.org", adminId: people.dircur.id }, lesson.id);
    expect(r).toMatchObject({ ok: true, title: "Trash me lesson" });
    expect(await d.select().from(contentItems).where(eq(contentItems.id, handout.id))).toEqual([]);
    await expect(fs.stat(path.join(MEDIA_DIR, h.fileKey!))).resolves.toBeTruthy(); // file kept while in the trash
    const row = (await listTrash()).find((x) => x.title === "Trash me lesson")!;
    expect(row.detail).toMatch(/with 1 material/);
    expect(row.deletedByName).toBe("dircur");

    expect(await restoreTrash(people.owner, row.id)).toMatchObject({ ok: true });
    const [backLesson] = await d.select().from(contentItems).where(eq(contentItems.id, lesson.id));
    const [backHandout] = await d.select().from(contentItems).where(eq(contentItems.id, handout.id));
    expect(backLesson.slug).toBe(lesson.slug);
    expect(backHandout).toMatchObject({ parentId: lesson.id, fileKey: h.fileKey });
    expect(await d.select().from(classAssignments).where(eq(classAssignments.contentId, lesson.id))).toHaveLength(1);
    expect(await restoreTrash(people.owner, row.id)).toMatchObject({ ok: false });

    // Deleted again, then 30 days pass: deleted for good, files included.
    await trashContent({ email: "x" }, lesson.id);
    expect(await purgeExpiredTrash(new Date(Date.now() + 29 * 86400_000))).toBe(0);
    expect(await purgeExpiredTrash(new Date(Date.now() + 31 * 86400_000))).toBeGreaterThanOrEqual(1);
    expect(await d.select().from(trash).where(eq(trash.title, "Trash me lesson"))).toEqual([]);
    await expect(fs.stat(path.join(MEDIA_DIR, h.fileKey!))).rejects.toThrow();
  });
});

describe("profile pictures", () => {
  it("accepts real images only, and replaces the old one", async () => {
    expect(await setAvatar(people.dircur.id, new TextEncoder().encode("not an image"))).toMatchObject({ ok: false });
    const a = await setAvatar(people.dircur.id, PNG);
    expect(a.ok).toBe(true);
    cleanup.push(`avatars/${people.dircur.id}`);
    expect((await readAvatar(people.dircur.id))?.mime).toBe("image/png");
    const b = await setAvatar(people.dircur.id, PNG);
    if (!a.ok || !b.ok) throw new Error("upload failed");
    await expect(fs.stat(path.join(MEDIA_DIR, a.key))).rejects.toThrow();
    await removeAvatar(people.dircur.id);
    expect(await readAvatar(people.dircur.id)).toBeNull();
  });
});
