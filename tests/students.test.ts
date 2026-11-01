import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ClassLimitError, createClass, isListNickname, joinClass, MAX_CLASSES_PER_TEACHER, MAX_STUDENTS_PER_CLASS, randomNickname, removeStudent } from "@/lib/classes";
import { learnerMayOpen } from "@/lib/guard";
import { ageCheck, createStudentAccount, deleteStudentAccount, studentSignIn } from "@/lib/students";
import { ageFrom, TERMS_VERSION } from "@/lib/terms";
import { joinOrFail } from "./helpers/classes";
import { freshDb } from "./helpers/db";
import { content, makeTeacher } from "./helpers/factory";

beforeAll(async () => {
  await freshDb();
});

describe("class limits", () => {
  it(`a teacher can have at most ${MAX_CLASSES_PER_TEACHER} classes`, async () => {
    const t = await makeTeacher();
    for (let i = 0; i < MAX_CLASSES_PER_TEACHER; i++) await createClass(t.id, t.orgId!, `Class ${i + 1}`);
    await expect(createClass(t.id, t.orgId!, "One too many")).rejects.toBeInstanceOf(ClassLimitError);
    const d = await db();
    const rows = await d.select().from(s.classes).where(eq(s.classes.teacherId, t.id));
    expect(rows).toHaveLength(MAX_CLASSES_PER_TEACHER);
  });

  it(`a class seats at most ${MAX_STUDENTS_PER_CLASS} students, even when they join at the same time`, async () => {
    const t = await makeTeacher();
    const cls = await createClass(t.id, t.orgId!, "Full house");
    const results = await Promise.all(Array.from({ length: MAX_STUDENTS_PER_CLASS + 5 }, () => joinClass(cls.classCode)));
    expect(results.filter((r) => r && !r.full)).toHaveLength(MAX_STUDENTS_PER_CLASS);
    expect(results.filter((r) => r?.full)).toHaveLength(5);
    const d = await db();
    const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(s.studentSessions).where(eq(s.studentSessions.classId, cls.id));
    expect(n).toBe(MAX_STUDENTS_PER_CLASS);

    // Removing a student frees a seat.
    const first = results.find((r) => r && !r.full);
    await removeStudent(cls.id, first && !first.full ? first.session.id : "");
    await joinOrFail(cls.classCode);
    expect((await joinClass(cls.classCode))?.full).toBe(true);
  });
});

describe("student age screen", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  it("treats the birth month as not yet reached, so it errs younger", () => {
    expect(ageFrom(2013, 11, now)).toBe(12);
    expect(ageFrom(2013, 10, now)).toBe(13);
    expect(ageCheck(2013, 11, now)).toBe("under");
    expect(ageCheck(2013, 10, now)).toBe("ok");
    expect(ageCheck(2016, 3, now)).toBe("under");
    expect(ageCheck(2013, 13, now)).toBe("invalid");
    expect(ageCheck(1800, 1, now)).toBe("invalid");
  });
});

describe("free student accounts", () => {
  const nickname = randomNickname();
  const base = { password: "correct horse", nickname, birthYear: 2008, birthMonth: 1, agree: true };

  it("under 13 stores nothing", async () => {
    const r = await createStudentAccount({ ...base, email: "young@example.test", birthYear: new Date().getFullYear() - 10 });
    expect(r).toMatchObject({ ok: false, under: true });
    const d = await db();
    expect(await d.select().from(s.studentAccounts).where(eq(s.studentAccounts.email, "young@example.test"))).toHaveLength(0);
  });

  it("needs a list nickname, a real email, a long enough password and agreement to the terms", async () => {
    expect(isListNickname("Curious Otter")).toBe(true);
    expect(isListNickname("Jane Smith")).toBe(false);
    expect((await createStudentAccount({ ...base, email: "a@example.test", nickname: "Jane Smith" })).ok).toBe(false);
    expect((await createStudentAccount({ ...base, email: "not-an-email" })).ok).toBe(false);
    expect((await createStudentAccount({ ...base, email: "a@example.test", password: "short" })).ok).toBe(false);
    expect((await createStudentAccount({ ...base, email: "a@example.test", agree: false })).ok).toBe(false);
  });

  it("stores only email, password hash, nickname, birth year and the accepted terms", async () => {
    const r = await createStudentAccount({ ...base, email: "Learner@Example.test" });
    expect(r.ok).toBe(true);
    const d = await db();
    const cols = (await d.execute(sql`select column_name from information_schema.columns where table_name = 'student_accounts'`)) as unknown as { rows: { column_name: string }[] };
    expect(cols.rows.map((c) => c.column_name).sort()).toEqual(["birth_year", "created_at", "email", "failed_logins", "id", "last_seen_at", "locked_until", "nickname", "password_hash", "terms_accepted_at", "terms_version"]);
    const [row] = await d.select().from(s.studentAccounts).where(eq(s.studentAccounts.email, "learner@example.test"));
    expect(row.passwordHash).not.toContain("correct horse");
    expect(row.termsVersion).toBe(TERMS_VERSION);
    expect((await createStudentAccount({ ...base, email: "learner@example.test" })).ok).toBe(false); // one account per email
  });

  it("signs in, refuses a wrong password with a generic message, and locks after repeated failures", async () => {
    expect((await studentSignIn("LEARNER@example.test", "correct horse")).ok).toBe(true);
    expect(await studentSignIn("learner@example.test", "wrong")).toEqual({ ok: false, error: "That email and password don't match." });
    expect(await studentSignIn("nobody@example.test", "wrong")).toEqual({ ok: false, error: "That email and password don't match." });
    for (let i = 0; i < 8; i++) await studentSignIn("learner@example.test", "wrong");
    expect((await studentSignIn("learner@example.test", "correct horse")).ok).toBe(false);
  });

  it("deleting the account removes it and its sessions", async () => {
    await createStudentAccount({ ...base, email: "bye@example.test" });
    const d = await db();
    const [acct] = await d.select().from(s.studentAccounts).where(eq(s.studentAccounts.email, "bye@example.test"));
    await deleteStudentAccount(acct.id);
    expect(await d.select().from(s.studentAccounts).where(eq(s.studentAccounts.id, acct.id))).toHaveLength(0);
    expect(await d.select().from(s.studentAccountSessions).where(eq(s.studentAccountSessions.accountId, acct.id))).toHaveLength(0);
  });

  it("opens free student material only: never kit, subscription, training or teacher-only material", async () => {
    expect(learnerMayOpen(await content("luminol-a0-predict"))).toBe(true);
    expect(learnerMayOpen(await content("luminol-limit-lab"))).toBe(true);
    expect(learnerMayOpen(await content("luminol-a1-why-it-glows"))).toBe(false);
    expect(learnerMayOpen(await content("luminol-teacher-guide"))).toBe(false);
    expect(learnerMayOpen(await content("training-curie-ai"))).toBe(false);
    expect(learnerMayOpen({ requiredTier: "free", type: "pdf", materialKind: "teacher_manual" })).toBe(false);
  });
});
