import { eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { adminSessions, adminUsers, auditLog, classes, contentItems, entitlements, kits, redemptionCodes, sessions, teachers } from "@/db/schema";
import { deleteTeacherAccount } from "@/lib/account";
import { adminLogin, changeOwnPassword, createAdmin, ensureBootstrapAdmin, resetAdminPassword, setAdminActive, setAdminRole, type CompanyAdmin } from "@/lib/auth/admin";
import { asRole, can } from "@/lib/auth/roles";
import { createSession, MAX_DEVICES } from "@/lib/auth/session";
import { addLessonMaterial, deleteContent, saveContent, updateLessonDetails, uploadPackage } from "@/lib/cms";
import { isTeacherOnly } from "@/lib/materials";
import { packageUrl, unpackLesson } from "@/lib/packages";
import { redeemCode } from "@/lib/redeem";
import { sharingAlerts, transferSeat } from "@/lib/security";
import { MEDIA_DIR } from "@/lib/storage";
import { GET as servePackage } from "@/app/api/lesson-pkg/[token]/[...path]/route";
import { freshDb } from "./helpers/db";
import { codesFor, makeTeacher } from "./helpers/factory";

const studio = { teacherId: null, email: "CurioCrateAdmin" };
const cleanup: string[] = [];

beforeAll(async () => {
  await freshDb();
});
afterAll(async () => {
  await Promise.all(cleanup.map((p) => fs.rm(path.join(MEDIA_DIR, p), { recursive: true, force: true })));
});

async function me(username = "CurioCrateAdmin"): Promise<CompanyAdmin> {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(eq(adminUsers.username, username));
  return { id: u.id, username: u.username, name: u.name, role: asRole(u.role), sessionId: "test" };
}

describe("Studio accounts (password only)", () => {
  it("a deployed site never creates the development account; it needs ADMIN_PASSWORD", async () => {
    await freshDb();
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    expect((await ensureBootstrapAdmin()).ready).toBe(false);
    expect((await adminLogin("CurioCrateAdmin", "WeLuvCurie@3322", "p1")).ok).toBe(false);
    vi.stubEnv("ADMIN_USERNAME", "owner");
    vi.stubEnv("ADMIN_PASSWORD", "a-long-production-passphrase");
    expect((await adminLogin("owner", "a-long-production-passphrase", "p1")).ok).toBe(true);
    vi.unstubAllEnvs();
    await freshDb();
  });

  it("the team can add accounts; passwords are hashed, checked and changeable", async () => {
    expect((await adminLogin("CurioCrateAdmin", "WeLuvCurie@3322", "a1")).ok).toBe(true);
    const owner = await me();
    expect(owner.role).toBe("admin");
    expect(await createAdmin(owner, { email: "maria@curiocrate.org", name: "Maria", role: "admin", password: "short" })).toMatchObject({ ok: false });
    expect(await createAdmin(owner, { email: "not-an-email", name: "Maria", role: "admin", password: "correct horse battery" })).toMatchObject({ ok: false });
    expect(await createAdmin(owner, { email: "maria@curiocrate.org", name: "Maria", role: "superuser", password: "correct horse battery" })).toMatchObject({ ok: false });
    expect(await createAdmin(owner, { email: "Maria@CurioCrate.org", name: "Maria", role: "admin", password: "correct horse battery" })).toMatchObject({ ok: true });
    expect(await createAdmin(owner, { email: "maria@curiocrate.org", name: "Maria 2", role: "admin", password: "correct horse battery" })).toMatchObject({ ok: false, error: /already/ });
    const d = await db();
    const [row] = await d.select().from(adminUsers).where(eq(adminUsers.username, "maria@curiocrate.org"));
    expect(row.passwordHash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(row.email).toBe("maria@curiocrate.org");
    // Sign in with the email (any case); the username is the email for people added by email.
    expect((await adminLogin("MARIA@curiocrate.org", "correct horse battery", "a2")).ok).toBe(true);
    expect((await adminLogin("maria@curiocrate.org", "correct horse battery", "a2")).ok).toBe(true);

    const maria = await me("maria@curiocrate.org");
    expect(await changeOwnPassword(maria, "wrong", "another long password")).toMatchObject({ ok: false });
    expect(await changeOwnPassword(maria, "correct horse battery", "another long password")).toMatchObject({ ok: true });
    expect((await adminLogin("maria@curiocrate.org", "correct horse battery", "a2")).ok).toBe(false);
    expect((await adminLogin("maria@curiocrate.org", "another long password", "a2")).ok).toBe(true);
  });

  it("disabling or resetting an account ends its sessions; the last active account can't be disabled", async () => {
    const owner = await me();
    const maria = await me("maria@curiocrate.org");
    const d = await db();
    expect((await d.select().from(adminSessions).where(eq(adminSessions.adminId, maria.id))).length).toBeGreaterThan(0);
    expect(await setAdminActive(owner, maria.id, false)).toMatchObject({ ok: true });
    expect(await d.select().from(adminSessions).where(eq(adminSessions.adminId, maria.id))).toEqual([]);
    expect(await adminLogin("maria@curiocrate.org", "another long password", "a3")).toMatchObject({ ok: false, error: /disabled/ });
    expect(await setAdminActive(owner, owner.id, false)).toMatchObject({ ok: false });
    await setAdminActive(owner, maria.id, true);
    expect(await resetAdminPassword(owner, maria.id, "reset by the owner ok")).toMatchObject({ ok: true });
    expect((await adminLogin("maria@curiocrate.org", "reset by the owner ok", "a3")).ok).toBe(true);
  });
});

describe("Studio roles: admin, product officer, curriculum", () => {
  it("each tier opens only its own areas", () => {
    expect(["lessons", "library", "kits", "codes", "schools", "teachers", "security", "usage", "audit", "team", "erase"].every((p) => can("admin", p as never))).toBe(true);
    expect(["lessons", "library", "kits", "codes", "schools", "teachers"].every((p) => can("product", p as never))).toBe(true);
    expect(["security", "usage", "audit", "team", "erase"].some((p) => can("product", p as never))).toBe(false);
    expect(can("curriculum", "lessons")).toBe(true);
    expect(["library", "kits", "codes", "schools", "teachers", "security", "usage", "audit", "team", "erase"].some((p) => can("curriculum", p as never))).toBe(false);
    expect(asRole("root")).toBe("curriculum"); // unknown values get the least access
  });

  it("people are added with a role; roles change; Studio always keeps one active admin", async () => {
    const owner = await me();
    expect(await createAdmin(owner, { email: "po@curiocrate.org", name: "Pat Product", role: "product", password: "product officer pass" })).toMatchObject({ ok: true });
    expect(await createAdmin(owner, { email: "cur@curiocrate.org", name: "Cam Curriculum", role: "curriculum", password: "lesson writer pass 7" })).toMatchObject({ ok: true });
    const po = await me("po@curiocrate.org");
    expect(po.role).toBe("product");
    expect((await me("cur@curiocrate.org")).role).toBe("curriculum");

    expect(await setAdminRole(owner, owner.id, "curriculum")).toMatchObject({ ok: false }); // not your own
    expect(await setAdminRole(owner, po.id, "wizard")).toMatchObject({ ok: false });
    expect(await setAdminRole(owner, po.id, "curriculum")).toMatchObject({ ok: true });
    expect((await me("po@curiocrate.org")).role).toBe("curriculum");

    // With the owner as the only active admin, nobody can demote or disable them.
    const d = await db();
    const otherAdmins = (await d.select().from(adminUsers)).filter((u) => u.role === "admin" && u.active && u.id !== owner.id);
    for (const u of otherAdmins) await setAdminActive(owner, u.id, false);
    expect(await setAdminRole(po, owner.id, "curriculum")).toMatchObject({ ok: false, error: /admin/ });
    expect(await setAdminActive(po, owner.id, false)).toMatchObject({ ok: false, error: /admin/ });
    for (const u of otherAdmins) await setAdminActive(owner, u.id, true);
  });
});

describe("lesson materials", () => {
  it("attaches typed materials to a lesson, keeps them in the lesson's kit and tier, and deletes them with it", async () => {
    const d = await db();
    const [kit] = await d.select().from(kits);
    const lesson = await saveContent(studio, null, { kitId: kit.id, parentId: null, type: "interactive", title: "Materials test lesson", summary: "", requiredTier: "kit_owner", section: null, minutes: null, ngss: [], bodyText: "", captionsText: "", labSlug: null });
    const training = await addLessonMaterial(studio, lesson.id, { kind: "training_video", title: "How to run it", media: "video" });
    const manual = await addLessonMaterial(studio, lesson.id, { kind: "teacher_manual", title: "Teacher manual", media: "file" });
    expect(training).toMatchObject({ parentId: lesson.id, type: "video", materialKind: "training_video", kitId: kit.id, requiredTier: "kit_owner", mediaStatus: "uploading" });
    expect(manual).toMatchObject({ type: "pdf", materialKind: "teacher_manual" });
    expect(isTeacherOnly(training.materialKind) && isTeacherOnly(manual.materialKind)).toBe(true);
    expect(isTeacherOnly("demo")).toBe(false);

    await updateLessonDetails(studio, lesson.id, { title: "Renamed lesson", summary: "s", kitId: kit.id, requiredTier: "free", minutes: 30, ngss: ["MS-PS1-2"] });
    const kids = await d.select().from(contentItems).where(eq(contentItems.parentId, lesson.id));
    expect(kids.every((k) => k.requiredTier === "free")).toBe(true);
    const [after] = await d.select().from(contentItems).where(eq(contentItems.id, lesson.id));
    expect(after).toMatchObject({ title: "Renamed lesson", minutes: 30, ngss: ["MS-PS1-2"] });

    await deleteContent(studio, lesson.id);
    expect(await d.select().from(contentItems).where(eq(contentItems.parentId, lesson.id))).toEqual([]);
  });
});

describe("interactive (HTML/JavaScript) lessons", () => {
  const zip = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));

  it("unpacks a zip (even inside one top folder), a single .html, or a .js file", () => {
    const a = unpackLesson(zip({ "magnets/index.html": "<script src=app.js></script>", "magnets/app.js": "1", "__MACOSX/x": "junk" }), "magnets.zip", "Magnets");
    expect(a.entry).toBe("index.html");
    expect(a.files.map((f) => f.path).sort()).toEqual(["app.js", "index.html"]);
    expect(unpackLesson(strToU8("<h1>Hi</h1>"), "lesson.html", "Hi").entry).toBe("index.html");
    const js = unpackLesson(strToU8("document.body.append('hi')"), "sim.js", "Sim <b>");
    expect(js.files.map((f) => f.path)).toEqual(["lesson.js", "index.html"]);
    expect(new TextDecoder().decode(js.files[1].data)).toContain("Sim &lt;b&gt;");
  });

  it("refuses unsafe or unusable packages", () => {
    expect(() => unpackLesson(zip({ "../evil.html": "x" }), "bad.zip", "x")).toThrow(/unsafe path/);
    expect(() => unpackLesson(zip({ "a/readme.txt": "x", "b/notes.txt": "y" }), "nohtml.zip", "x")).toThrow(/index\.html/);
    expect(() => unpackLesson(strToU8("not a zip"), "fake.zip", "x")).toThrow(/isn't a lesson package/);
  });

  it("an uploaded lesson is stored, served sandboxed behind a signed link, and replaced atomically", async () => {
    const d = await db();
    const [k] = await d.select().from(kits).limit(1);
    const row = await saveContent(studio, null, { kitId: k.id, parentId: null, type: "interactive", title: "Magnet sim", summary: "", requiredTier: "kit_owner", section: null, minutes: null, ngss: [], bodyText: "", captionsText: "", labSlug: null });
    const r1 = await uploadPackage(studio, row.id, "sim.zip", zip({ "index.html": "<h1>v1</h1>", "data/poles.json": "{}" }));
    expect(r1).toEqual({ files: 2, entry: "index.html" });
    const [v1] = await d.select().from(contentItems).where(eq(contentItems.id, row.id));
    cleanup.push(`lessons/${v1.slug}`);

    const url = (await packageUrl(v1))!;
    const [, , , token, ...rest] = url.split("/");
    const get = (t: string, p: string[]) => servePackage(new Request("http://x/") as never, { params: Promise.resolve({ token: t, path: p }) });
    const res = await get(token, rest);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>v1</h1>");
    expect(res.headers.get("content-security-policy")).toMatch(/^sandbox allow-scripts/);
    expect(res.headers.get("content-security-policy")).not.toMatch(/allow-same-origin/);
    expect((await get(token, ["data", "poles.json"])).status).toBe(200);
    expect((await get(token, ["..", "..", "files", "x.pdf"])).status).toBe(404);
    expect((await get("forged.token.value", rest)).status).toBe(403);

    await uploadPackage(studio, row.id, "sim.html", strToU8("<h1>v2</h1>"));
    const [v2] = await d.select().from(contentItems).where(eq(contentItems.id, row.id));
    expect(v2.packageKey).not.toBe(v1.packageKey);
    await expect(fs.stat(path.join(MEDIA_DIR, v1.packageKey!))).rejects.toThrow(); // old version removed

    await deleteContent(studio, row.id);
    await expect(fs.stat(path.join(MEDIA_DIR, v2.packageKey!))).rejects.toThrow(); // files removed with the lesson
  });
});

describe("sharing protections", () => {
  it("a teacher is signed in on at most 3 devices; the oldest is signed out", async () => {
    const t = await makeTeacher();
    for (let i = 0; i < MAX_DEVICES + 2; i++) await createSession(t.id, { ip: `10.0.0.${i}` });
    const d = await db();
    expect((await d.select().from(sessions).where(eq(sessions.teacherId, t.id))).length).toBe(MAX_DEVICES);
    const logged = await d.select().from(auditLog).where(eq(auditLog.actorTeacherId, t.id));
    expect(logged.every((l) => !JSON.stringify(l.details).includes("10.0.0"))).toBe(true); // only hashes are stored
  });

  it("flags an account signing in from many networks, and seats can be moved to the right teacher", async () => {
    const t = await makeTeacher();
    for (let i = 0; i < 6; i++) await createSession(t.id, { ip: `172.16.0.${i}` });
    expect((await sharingAlerts()).manyPlaces.map((r) => r.email)).toContain(t.email);

    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    const colleague = await makeTeacher();
    const d = await db();
    const [seat] = await d.select().from(entitlements).where(eq(entitlements.teacherId, t.id));
    expect(await transferSeat(studio, seat.id, colleague.email)).toMatchObject({ ok: true });
    const [moved] = await d.select().from(entitlements).where(eq(entitlements.id, seat.id));
    expect(moved).toMatchObject({ teacherId: colleague.id, orgId: colleague.orgId });
  });
});

describe("teacher account deletion", () => {
  it("deletes the account and what belongs to it; used codes stay used", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    await createSession(t.id);
    const d = await db();
    await d.insert(classes).values({ teacherId: t.id, orgId: t.orgId!, name: "Period 1", classCode: "QWERTY" });
    await d.insert(auditLog).values({ action: "teacher.move", targetType: "teacher", targetId: t.id, details: { email: t.email } });
    expect(await deleteTeacherAccount(t.id)).toBe(true);
    expect(await d.select().from(teachers).where(eq(teachers.id, t.id))).toEqual([]);
    expect(await d.select().from(sessions).where(eq(sessions.teacherId, t.id))).toEqual([]);
    expect(await d.select().from(entitlements).where(eq(entitlements.teacherId, t.id))).toEqual([]);
    expect(await d.select().from(classes).where(eq(classes.classCode, "QWERTY"))).toEqual([]);
    const audit = await d.select().from(auditLog);
    expect(JSON.stringify(audit)).not.toContain(t.email);
    const [c] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    expect(c).toMatchObject({ status: "redeemed", redeemedByTeacherId: null });
    const other = await makeTeacher();
    expect(await redeemCode(other.id, code)).toMatchObject({ ok: false, error: "already_redeemed" });
  });
});

describe("cloud only on the live site", () => {
  it("refuses local file storage when cloud is required", async () => {
    vi.stubEnv("REQUIRE_CLOUD", "1");
    vi.stubEnv("S3_BUCKET", "");
    const { putObject } = await import("@/lib/storage");
    await expect(putObject("uploads/file/x", Buffer.from("x"), "text/plain")).rejects.toThrow(/Cloud file storage is not configured/);
    vi.unstubAllEnvs();
  });
});
