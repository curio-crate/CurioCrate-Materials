import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import * as s from "@/db/schema";
import { exchangeCode, issueTestCode, redirectUri, type ProviderId } from "@/lib/auth/providers";
import { pkceChallenge } from "@/lib/auth/flow";
import { createClass, joinClass, saveLabRun, setAssigned } from "@/lib/classes";
import { bodyToText, parseBody, parseCaptions } from "@/lib/cms";
import { bulbBrightness, luminolGlow, runFilter } from "@/lib/labs";
import { deleteOrganizationData } from "@/lib/privacy";
import { redeemCode } from "@/lib/redeem";
import { upsertTeacherFromProfile } from "@/lib/teachers";
import { joinOrFail } from "./helpers/classes";
import { freshDb } from "./helpers/db";
import { addColleague, codesFor, content, makeTeacher } from "./helpers/factory";

beforeAll(async () => {
  await freshDb();
});

describe("students join with a class code and the database stores no personal detail", () => {
  it("join + lab run store only random ids, a generated nickname and numeric results", async () => {
    const t = await makeTeacher();
    const cls = await createClass(t.id, t.orgId!, "Period 3 Science");
    await setAssigned(cls.id, (await content("luminol-limit-lab")).id, true);
    const joined = await joinOrFail(cls.classCode.toLowerCase());
    expect(joined).not.toBeNull();
    await saveLabRun("luminol-limit", { room: "dark", ratings: [3, 3, 2, 1, 1, 0], limit: 5 }, { classId: cls.id, studentSessionId: joined!.session.id });

    const d = await db();
    // Schema check: the student table has no column that could hold a name, email or other identity.
    const cols = (await d.execute(sql`select column_name from information_schema.columns where table_name = 'student_sessions'`)) as unknown as { rows: { column_name: string }[] };
    expect(cols.rows.map((r) => r.column_name).sort()).toEqual(["class_id", "created_at", "id", "last_seen_at", "nickname", "token_hash"]);
    // Data check: every stored value is a uuid, hash, timestamp or a nickname from the fixed word list.
    const [row] = await d.select().from(s.studentSessions).where(eq(s.studentSessions.id, joined!.session.id));
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toContain(joined!.token);
    expect(row.nickname).toMatch(/^(Bright|Curious|Swift|Quiet|Brave|Clever|Sunny|Calm|Bold|Keen|Lucky|Merry) (Comet|Otter|Falcon|Nebula|Quasar|Heron|Maple|Pulsar|Lynx|Orbit|Coral|Atlas)$/);
    const runs = await d.select().from(s.labRuns).where(eq(s.labRuns.studentSessionId, row.id));
    const dump = JSON.stringify([row, runs]);
    expect(dump).not.toMatch(/@|\bname\b|email|phone|address|birth/i);
  });

  it("a wrong code does not create a session", async () => {
    expect(await joinClass("ZZZZZZ")).toBeNull();
  });
});

describe("each sign-in method works in its test mode", () => {
  for (const p of ["google", "clever", "classlink"] as ProviderId[]) {
    it(p, async () => {
      const verifier = "v".repeat(43);
      const code = await issueTestCode({ provider: p, email: `T@${p}.test`, name: "Test", redirectUri: redirectUri(p), codeChallenge: pkceChallenge(verifier) });
      const profile = await exchangeCode(p, code, verifier, pkceChallenge(verifier));
      expect(profile.email).toBe(`t@${p}.test`);
      const teacher = await upsertTeacherFromProfile(p, profile);
      expect(teacher.email).toBe(`t@${p}.test`);
      // A code minted for one provider can't be used with another, or with a different PKCE verifier.
      await expect(exchangeCode(p === "google" ? "clever" : "google", code, verifier, pkceChallenge(verifier))).rejects.toThrow();
      await expect(exchangeCode(p, code, "x".repeat(43), pkceChallenge("x".repeat(43)))).rejects.toThrow();
    });
  }
});

describe("data for one school can be fully deleted", () => {
  it("removes every row tied to the school and its teachers", async () => {
    const t = await makeTeacher({ school: "Delete Me Middle" });
    const colleague = await addColleague(t.orgId!);
    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    const cls = await createClass(t.id, t.orgId!, "Doomed class");
    const j = await joinOrFail(cls.classCode);
    await saveLabRun("circuit-sandbox", { observations: 2 }, { classId: cls.id, studentSessionId: j!.session.id });
    const d = await db();
    await d.insert(s.curieMessages).values({ classId: cls.id, studentSessionId: j!.session.id, role: "user", content: "why does it glow" });
    const other = await makeTeacher({ school: "Keep Me Elementary" });

    await deleteOrganizationData({ teacherId: null, email: "support@curiocrate.test" }, t.orgId!);

    const orgId = t.orgId!;
    const ids = [t.id, colleague.id];
    expect(await d.select().from(s.organizations).where(eq(s.organizations.id, orgId))).toHaveLength(0);
    for (const id of ids) {
      expect(await d.select().from(s.teachers).where(eq(s.teachers.id, id))).toHaveLength(0);
      expect(await d.select().from(s.sessions).where(eq(s.sessions.teacherId, id))).toHaveLength(0);
      expect(await d.select().from(s.authAccounts).where(eq(s.authAccounts.teacherId, id))).toHaveLength(0);
    }
    expect(await d.select().from(s.entitlements).where(eq(s.entitlements.orgId, orgId))).toHaveLength(0);
    expect(await d.select().from(s.classes).where(eq(s.classes.orgId, orgId))).toHaveLength(0);
    expect(await d.select().from(s.studentSessions).where(eq(s.studentSessions.classId, cls.id))).toHaveLength(0);
    expect(await d.select().from(s.labRuns).where(eq(s.labRuns.classId, cls.id))).toHaveLength(0);
    expect(await d.select().from(s.curieMessages).where(eq(s.curieMessages.classId, cls.id))).toHaveLength(0);
    expect(await d.select().from(s.auditLog).where(eq(s.auditLog.orgId, orgId))).toHaveLength(0);
    expect(await d.select().from(s.redemptionCodes).where(eq(s.redemptionCodes.redeemedOrgId, orgId))).toHaveLength(0);
    // Nothing anywhere still mentions the deleted teachers' emails.
    const everything = JSON.stringify(await Promise.all([s.teachers, s.orders, s.auditLog, s.redemptionCodes].map((tbl) => d.select().from(tbl))));
    expect(everything).not.toContain(t.email);
    expect(everything).not.toContain(colleague.email);
    // Other schools are untouched.
    expect(await d.select().from(s.teachers).where(eq(s.teachers.id, other.id))).toHaveLength(1);
  });
});

describe("lab science models", () => {
  it("luminol: glow fades tube by tube, water never glows, room light raises the limit", () => {
    const dark = [1, 2, 3, 4, 5, 6].map((n) => luminolGlow(n, "dark"));
    expect(dark[5]).toBe(0);
    for (let i = 1; i < 5; i++) expect(dark[i]).toBeLessThan(dark[i - 1]);
    expect(dark[4]).toBeGreaterThan(0);
    expect(luminolGlow(5, "dim")).toBe(0);
  });
  it("circuits: unscrewing a series bulb breaks the circuit; parallel bulbs stay lit", () => {
    expect(bulbBrightness("series", 2, 1, true, [true, false, false])).toEqual([0, 0]);
    expect(bulbBrightness("parallel", 2, 1, true, [true, false, false])[1]).toBeGreaterThan(0);
    expect(bulbBrightness("series", 2, 1, true, [false, false, false])[0]).toBeLessThan(bulbBrightness("parallel", 2, 1, true, [false, false, false])[0]);
  });
  it("filter: a good design passes, sand above gravel clogs, no cotton washes out", () => {
    const good = runFilter(["gravel", "sand", "charcoal", "cotton"]);
    expect(good.pass).toEqual({ clarity: true, flow: true, cost: true });
    expect(runFilter(["sand", "gravel", "charcoal", "cotton"]).flow).toBeLessThan(good.flow);
    expect(runFilter(["gravel", "sand", "charcoal"]).ntu).toBeGreaterThan(good.ntu);
  });
});

describe("studio lesson text and captions", () => {
  it("round-trips the lesson text format", () => {
    const text = "## Goals\n\nIntro paragraph.\n\n1. First\n2. Second\n\n- a\n- b\n\nMaterials: tube, beaker\n\n> Safety: Goggles on\n\n? Why does it glow?";
    const blocks = parseBody(text);
    expect(blocks.map((b) => b.type)).toEqual(["h", "p", "steps", "list", "materials", "callout", "explain"]);
    expect(parseBody(bodyToText(blocks))).toEqual(blocks);
  });
  it("parses WebVTT and times plain lines to the video length", () => {
    expect(parseCaptions("WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.500\nHello there")).toEqual([{ start: 0, end: 2.5, text: "Hello there" }]);
    const cues = parseCaptions("One line here.\nAnother line here.", 20);
    expect(cues).toHaveLength(2);
    expect(cues[1].end).toBeCloseTo(20, 0);
  });
});
