import "server-only";
import { and, count, desc, eq, ilike, or, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, contentItems, organizations, redemptionCodes, teachers, videoPlaybacks } from "@/db/schema";
import { newShortCode } from "./codes";
import type { Actor } from "./entitlements";
import { listEntitlements } from "./entitlements";

export async function searchOrgs(q: string, limit = 30) {
  const d = await db();
  const like = `%${q.trim()}%`;
  const base = d
    .select({ org: organizations, teachers: count(teachers.id) })
    .from(organizations)
    .leftJoin(teachers, eq(teachers.orgId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(desc(organizations.createdAt))
    .limit(limit);
  return q.trim() ? base.where(or(ilike(organizations.name, like), ilike(organizations.emailDomain, like), eq(organizations.joinCode, q.trim().toUpperCase()))) : base;
}

export async function orgDetail(orgId: string) {
  const d = await db();
  const [org] = await d.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return null;
  const [parent] = org.parentId ? await d.select().from(organizations).where(eq(organizations.id, org.parentId)) : [];
  const children = await d.select().from(organizations).where(eq(organizations.parentId, org.id));
  const staff = await d.select().from(teachers).where(eq(teachers.orgId, org.id)).orderBy(teachers.name);
  const ents = await listEntitlements(org.id);
  const codes = await d.select().from(redemptionCodes).where(eq(redemptionCodes.redeemedOrgId, org.id)).orderBy(desc(redemptionCodes.redeemedAt));
  const [usage] = await d
    .select({ seconds: sum(videoPlaybacks.secondsWatched), plays: count(videoPlaybacks.id) })
    .from(videoPlaybacks)
    .where(eq(videoPlaybacks.orgId, org.id));
  const audit = await d.select().from(auditLog).where(eq(auditLog.orgId, org.id)).orderBy(desc(auditLog.createdAt)).limit(25);
  return { org, parent: parent ?? null, children, staff, ents, codes, usage: { seconds: Number(usage?.seconds ?? 0), plays: Number(usage?.plays ?? 0) }, audit };
}

export async function districts() {
  const d = await db();
  return d.select().from(organizations).where(eq(organizations.type, "district")).orderBy(organizations.name);
}

export async function createOrg(actor: Actor, input: { name: string; type: "school" | "district"; state?: string; parentId?: string | null; emailDomain?: string | null }) {
  const d = await db();
  const [org] = await d
    .insert(organizations)
    .values({ name: input.name.trim(), type: input.type, state: input.state?.trim() || null, parentId: input.parentId || null, emailDomain: input.emailDomain?.trim().toLowerCase() || null, joinCode: newShortCode(6) })
    .returning();
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "org.create", targetType: "organization", targetId: org.id, orgId: org.id, details: { name: org.name, type: org.type } });
  return org;
}

export async function setParent(actor: Actor, orgId: string, parentId: string | null) {
  const d = await db();
  if (parentId === orgId) throw new Error("A school can't be its own district.");
  await d.update(organizations).set({ parentId }).where(eq(organizations.id, orgId));
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "org.set_district", targetType: "organization", targetId: orgId, orgId, details: { parentId } });
}

export async function setEmailDomain(actor: Actor, orgId: string, domain: string | null) {
  const d = await db();
  await d.update(organizations).set({ emailDomain: domain?.trim().toLowerCase() || null }).where(eq(organizations.id, orgId));
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "org.set_domain", targetType: "organization", targetId: orgId, orgId, details: { domain } });
}

/** Fix access: move a teacher to the right school (e.g. they created a duplicate school by mistake). */
export async function moveTeacher(actor: Actor, email: string, orgId: string) {
  const d = await db();
  const [org] = await d.select().from(organizations).where(eq(organizations.id, orgId));
  // Moving someone into a district makes them that district's admin (district dashboard).
  const [t] = await d.update(teachers).set({ orgId, membership: "active", isOrgAdmin: org?.type === "district" ? true : undefined }).where(eq(teachers.email, email.trim().toLowerCase())).returning();
  if (!t) return null;
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "teacher.move", targetType: "teacher", targetId: t.id, orgId, details: { email: t.email } });
  return t;
}

export async function findTeacher(email: string) {
  const d = await db();
  const [t] = await d.select({ t: teachers, orgName: organizations.name }).from(teachers).leftJoin(organizations, eq(organizations.id, teachers.orgId)).where(eq(teachers.email, email.trim().toLowerCase()));
  return t ?? null;
}

export async function recentAudit(limit = 60) {
  const d = await db();
  return d.select({ a: auditLog, orgName: organizations.name }).from(auditLog).leftJoin(organizations, eq(organizations.id, auditLog.orgId)).orderBy(desc(auditLog.createdAt)).limit(limit);
}

export async function platformStats() {
  const d = await db();
  const [[codes], [redeemed], [orgs], [tchr], [mins]] = await Promise.all([
    d.select({ n: count() }).from(redemptionCodes),
    d.select({ n: count() }).from(redemptionCodes).where(eq(redemptionCodes.status, "redeemed")),
    d.select({ n: count() }).from(organizations),
    d.select({ n: count() }).from(teachers),
    d.select({ s: sum(videoPlaybacks.secondsWatched) }).from(videoPlaybacks),
  ]);
  return { codes: codes.n, redeemed: redeemed.n, orgs: orgs.n, teachers: tchr.n, videoMinutes: Math.round(Number(mins.s ?? 0) / 60) };
}

/** Streaming usage per school (minutes watched, plays) for the support tool and district dashboards. */
export async function streamingUsageByOrg(orgIds?: string[]) {
  const d = await db();
  const q = d
    .select({ orgId: videoPlaybacks.orgId, name: organizations.name, seconds: sum(videoPlaybacks.secondsWatched), plays: count(videoPlaybacks.id) })
    .from(videoPlaybacks)
    .leftJoin(organizations, eq(organizations.id, videoPlaybacks.orgId))
    .groupBy(videoPlaybacks.orgId, organizations.name)
    .orderBy(desc(sql`sum(${videoPlaybacks.secondsWatched})`));
  const rows = await (orgIds?.length ? q.where(sql`${videoPlaybacks.orgId} in ${orgIds}`) : q);
  return rows.map((r) => ({ ...r, minutes: Math.round(Number(r.seconds ?? 0) / 60), plays: Number(r.plays) }));
}

export async function contentTitle(id: string) {
  const d = await db();
  const [c] = await d.select({ title: contentItems.title }).from(contentItems).where(and(eq(contentItems.id, id)));
  return c?.title ?? null;
}
