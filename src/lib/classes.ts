import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomInt } from "node:crypto";
import { cache } from "react";
import { db } from "@/db";
import { classAssignments, classes, contentItems, labRuns, studentSessions, teachers } from "@/db/schema";
import { newShortCode } from "./codes";
import { randomToken, sha256 } from "./crypto";

// Classes and anonymous student sessions. Students never create accounts and never type anything about
// themselves: joining stores only a random token hash and a nickname picked from fixed word lists.

export const STUDENT_COOKIE = "cc_student";
const ADJ = ["Bright", "Curious", "Swift", "Quiet", "Brave", "Clever", "Sunny", "Calm", "Bold", "Keen", "Lucky", "Merry"];
const NOUN = ["Comet", "Otter", "Falcon", "Nebula", "Quasar", "Heron", "Maple", "Pulsar", "Lynx", "Orbit", "Coral", "Atlas"];

export async function createClass(teacherId: string, orgId: string, name: string) {
  const d = await db();
  const [c] = await d.insert(classes).values({ teacherId, orgId, name: name.trim().slice(0, 60), classCode: newShortCode(6) }).returning();
  return c;
}

export async function classesFor(teacherId: string) {
  const d = await db();
  return d
    .select({ c: classes, students: count(studentSessions.id) })
    .from(classes)
    .leftJoin(studentSessions, eq(studentSessions.classId, classes.id))
    .where(eq(classes.teacherId, teacherId))
    .groupBy(classes.id)
    .orderBy(desc(classes.createdAt));
}

export async function ownedClass(classId: string, teacherId: string) {
  const d = await db();
  const [c] = await d.select().from(classes).where(and(eq(classes.id, classId), eq(classes.teacherId, teacherId)));
  return c ?? null;
}

export async function assignments(classId: string) {
  const d = await db();
  return d.select({ item: contentItems }).from(classAssignments).innerJoin(contentItems, eq(contentItems.id, classAssignments.contentId)).where(eq(classAssignments.classId, classId)).orderBy(asc(contentItems.sortOrder));
}

export async function setAssigned(classId: string, contentId: string, on: boolean) {
  const d = await db();
  if (on) await d.insert(classAssignments).values({ classId, contentId }).onConflictDoNothing();
  else await d.delete(classAssignments).where(and(eq(classAssignments.classId, classId), eq(classAssignments.contentId, contentId)));
}

export async function updateClass(classId: string, patch: Partial<Pick<typeof classes.$inferInsert, "name" | "curieEnabled" | "curieDailyLimit">>) {
  const d = await db();
  await d.update(classes).set(patch).where(eq(classes.id, classId));
}

/** Student joins with the class code. Returns the cookie token (only its hash is stored). */
export async function joinClass(code: string) {
  const d = await db();
  const [c] = await d.select().from(classes).where(eq(classes.classCode, code.toUpperCase().replace(/[^A-Z]/g, "")));
  if (!c) return null;
  const token = randomToken();
  const nickname = `${ADJ[randomInt(ADJ.length)]} ${NOUN[randomInt(NOUN.length)]}`;
  const [s] = await d.insert(studentSessions).values({ classId: c.id, tokenHash: sha256(token), nickname }).returning();
  return { token, session: s, cls: c };
}

export const currentStudent = cache(async () => {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  const d = await db();
  const [row] = await d
    .select({ s: studentSessions, c: classes, teacher: { id: teachers.id, name: teachers.name, orgId: teachers.orgId } })
    .from(studentSessions)
    .innerJoin(classes, eq(classes.id, studentSessions.classId))
    .innerJoin(teachers, eq(teachers.id, classes.teacherId))
    .where(eq(studentSessions.tokenHash, sha256(token)));
  if (!row) return null;
  await d.update(studentSessions).set({ lastSeenAt: new Date() }).where(eq(studentSessions.id, row.s.id));
  return row;
});

export async function saveLabRun(labSlug: string, data: Record<string, number | string | boolean | number[]>, who: { classId?: string | null; studentSessionId?: string | null; teacherId?: string | null }) {
  const d = await db();
  const [r] = await d.insert(labRuns).values({ labSlug, data, classId: who.classId ?? null, studentSessionId: who.studentSessionId ?? null, teacherId: who.teacherId ?? null }).returning();
  return r;
}

export async function classResults(classId: string) {
  const d = await db();
  return d
    .select({ run: labRuns, nickname: studentSessions.nickname })
    .from(labRuns)
    .leftJoin(studentSessions, eq(studentSessions.id, labRuns.studentSessionId))
    .where(eq(labRuns.classId, classId))
    .orderBy(desc(labRuns.createdAt))
    .limit(200);
}

export async function isAssigned(classId: string, contentIds: string[]) {
  if (!contentIds.length) return false;
  const d = await db();
  const [{ n }] = await d.select({ n: count() }).from(classAssignments).where(and(eq(classAssignments.classId, classId), inArray(classAssignments.contentId, contentIds)));
  return n > 0;
}

export async function studentCount(classId: string) {
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(studentSessions).where(eq(studentSessions.classId, classId));
  return n;
}
