import "server-only";
import { count, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { classes, contentViews, curieMessages, entitlements, kits, organizations, studentSessions, teachers, videoPlaybacks } from "@/db/schema";

/** Per-school usage for a district dashboard. */
export async function districtReport(districtId: string) {
  const d = await db();
  const schools = await d.select().from(organizations).where(eq(organizations.parentId, districtId));
  const ids = schools.map((s) => s.id);
  if (!ids.length) return { schools: [], totals: { teachers: 0, students: 0, minutes: 0, views: 0, curie: 0 } };
  const by = <T extends { orgId: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.orgId, r]));
  const [t, stu, vid, views, cur, ents] = await Promise.all([
    d.select({ orgId: teachers.orgId, n: count() }).from(teachers).where(inArray(teachers.orgId, ids)).groupBy(teachers.orgId),
    d.select({ orgId: classes.orgId, n: count(studentSessions.id) }).from(classes).leftJoin(studentSessions, eq(studentSessions.classId, classes.id)).where(inArray(classes.orgId, ids)).groupBy(classes.orgId),
    d.select({ orgId: videoPlaybacks.orgId, s: sum(videoPlaybacks.secondsWatched) }).from(videoPlaybacks).where(inArray(videoPlaybacks.orgId, ids)).groupBy(videoPlaybacks.orgId),
    d.select({ orgId: contentViews.orgId, n: sum(contentViews.views) }).from(contentViews).where(inArray(contentViews.orgId, ids)).groupBy(contentViews.orgId),
    d.select({ orgId: classes.orgId, n: count(curieMessages.id) }).from(classes).leftJoin(curieMessages, eq(curieMessages.classId, classes.id)).where(inArray(classes.orgId, ids)).groupBy(classes.orgId),
    d.select({ orgId: entitlements.orgId, kit: kits.shortName }).from(entitlements).innerJoin(kits, eq(kits.id, entitlements.kitId)).where(inArray(entitlements.orgId, ids)),
  ]);
  const T = by(t), S = by(stu), V = by(vid), W = by(views), C = by(cur);
  const rows = schools.map((s) => ({
    school: s,
    teachers: Number(T.get(s.id)?.n ?? 0),
    students: Number(S.get(s.id)?.n ?? 0),
    minutes: Math.round(Number(V.get(s.id)?.s ?? 0) / 60),
    views: Number(W.get(s.id)?.n ?? 0),
    curie: Number(C.get(s.id)?.n ?? 0),
    kits: [...new Set(ents.filter((e) => e.orgId === s.id).map((e) => e.kit))],
  }));
  const totals = rows.reduce((a, r) => ({ teachers: a.teachers + r.teachers, students: a.students + r.students, minutes: a.minutes + r.minutes, views: a.views + r.views, curie: a.curie + r.curie }), { teachers: 0, students: 0, minutes: 0, views: 0, curie: 0 });
  return { schools: rows, totals };
}
