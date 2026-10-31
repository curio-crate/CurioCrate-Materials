import { eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { adminSessions, adminUsers, auditLog, classes, contentItems, entitlements, kits, redemptionCodes, sessions, teachers } from "@/db/schema";
import { deleteTeacherAccount } from "@/lib/account";
import { adminLogin, changeOwnPassword, createAdmin, ensureBootstrapAdmin, resetAdminPassword, setAdminActive, type CompanyAdmin } from "@/lib/auth/admin";
import { createSession, MAX_DEVICES } from "@/lib/auth/session";
import { deleteContent, saveContent, uploadPackage } from "@/lib/cms";
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
  return { id: u.id, username: u.username, name: u.name, sessionId: "test" };
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
    expect(await createAdmin(owner, { username: "maria", name: "Maria", password: "short" })).toMatchObject({ ok: false });
    expect(await createAdmin(owner, { username: "maria", name: "Maria", password: "correct horse battery" })).toMatchObject({ ok: true });
    expect(await createAdmin(owner, { username: "maria", name: "Maria 2", password: "correct horse battery" })).toMatchObject({ ok: false, error: /taken/ });
    const d = await db();
    const [row] = await d.select().from(adminUsers).where(eq(adminUsers.username, "maria"));
    expect(row.passwordHash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect((await adminLogin("maria", "correct horse battery", "a2")).ok).toBe(true);

    const maria = await me("maria");
    expect(await changeOwnPassword(maria, "wrong", "another long password")).toMatchObject({ ok: false });
    expect(await changeOwnPassword(maria, "correct horse battery", "another long password")).toMatchObject({ ok: true });
    expect((await adminLogin("maria", "correct horse battery", "a2")).ok).toBe(false);
    expect((await adminLogin("maria", "another long password", "a2")).ok).toBe(true);
  });

  it("disabling or resetting an account ends its sessions; the last active account can't be disabled", async () => {
    const owner = await me();
    const maria = await me("maria");
    const d = await db();
    expect((await d.select().from(adminSessions).where(eq(adminSessions.adminId, maria.id))).length).toBeGreaterThan(0);
    expect(await setAdminActive(owner, maria.id, false)).toMatchObject({ ok: true });
    expect(await d.select().from(adminSessions).where(eq(adminSessions.adminId, maria.id))).toEqual([]);
    expect(await adminLogin("maria", "another long password", "a3")).toMatchObject({ ok: false, error: /disabled/ });
    expect(await setAdminActive(owner, owner.id, false)).toMatchObject({ ok: false });
    await setAdminActive(owner, maria.id, true);
    expect(await resetAdminPassword(owner, maria.id, "reset by the owner ok")).toMatchObject({ ok: true });
    expect((await adminLogin("maria", "reset by the owner ok", "a3")).ok).toBe(true);
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
