import "server-only";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, contentItems, entitlements, kits, organizations, sessions, teachers } from "@/db/schema";
import type { Actor } from "./entitlements";

// Studio → Access and Security: look up a teacher's access, move seats, and spot signs of code or account sharing.

export async function teacherAccess(email: string) {
  const d = await db();
  const [row] = await d.select({ t: teachers, org: organizations }).from(teachers).leftJoin(organizations, eq(organizations.id, teachers.orgId)).where(eq(teachers.email, email.trim().toLowerCase()));
  if (!row) return null;
  const [seats, [devices], signIns] = await Promise.all([
    d.select({ e: entitlements, kitName: kits.name }).from(entitlements).leftJoin(kits, eq(kits.id, entitlements.kitId)).where(eq(entitlements.teacherId, row.t.id)).orderBy(desc(entitlements.createdAt)),
    d.select({ n: count() }).from(sessions).where(and(eq(sessions.teacherId, row.t.id), gt(sessions.expiresAt, new Date()))),
    d.select({ at: auditLog.createdAt, ip: sql<string | null>`${auditLog.details}->>'ip'` }).from(auditLog).where(and(eq(auditLog.actorTeacherId, row.t.id), eq(auditLog.action, "auth.signin"))).orderBy(desc(auditLog.createdAt)).limit(20),
  ]);
  return { teacher: row.t, org: row.org, seats, devices: devices.n, signIns, places: new Set(signIns.map((s) => s.ip).filter(Boolean)).size };
}

async function log(actor: Actor, action: string, targetId: string, orgId: string | null, details: Record<string, unknown>) {
  const d = await db();
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action, targetType: "entitlement", targetId, orgId, details });
}

/** Gives one teacher a personal kit seat (e.g. a code was lost or damaged). */
export async function grantSeat(actor: Actor, teacherId: string, kitId: string, reason: string) {
  const d = await db();
  const [t] = await d.select().from(teachers).where(eq(teachers.id, teacherId));
  if (!t?.orgId) return { ok: false as const, error: "That teacher has no school yet; they need one first." };
  const [has] = await d.select({ id: entitlements.id }).from(entitlements).where(and(eq(entitlements.teacherId, teacherId), eq(entitlements.kitId, kitId), isNull(entitlements.revokedAt)));
  if (has) return { ok: false as const, error: "They already have that kit." };
  const [row] = await d.insert(entitlements).values({ orgId: t.orgId, teacherId, kind: "kit", kitId, source: "manual", sourceRef: null }).returning();
  await log(actor, "entitlement.grant_seat", row.id, t.orgId, { kitId, email: t.email, reason });
  return { ok: true as const };
}

/** Moves a personal seat to another teacher (a teacher left, or redeemed a colleague's code by mistake). */
export async function transferSeat(actor: Actor, entitlementId: string, toEmail: string) {
  const d = await db();
  const [to] = await d.select().from(teachers).where(eq(teachers.email, toEmail.trim().toLowerCase()));
  if (!to?.orgId) return { ok: false as const, error: "No teacher with that email (with a school) has signed in yet." };
  const [row] = await d.update(entitlements).set({ teacherId: to.id, orgId: to.orgId }).where(and(eq(entitlements.id, entitlementId), sql`${entitlements.teacherId} is not null`)).returning();
  if (!row) return { ok: false as const, error: "Only personal seats can be moved." };
  await log(actor, "entitlement.transfer_seat", row.id, to.orgId, { to: to.email });
  return { ok: true as const, email: to.email };
}

export async function setContentTier(actor: Actor, contentId: string, tier: "free" | "kit_owner" | "subscription") {
  const d = await db();
  const [row] = await d.update(contentItems).set({ requiredTier: tier, isSample: tier === "free" }).where(eq(contentItems.id, contentId)).returning({ title: contentItems.title });
  if (row) await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "content.set_access", targetType: "content", targetId: contentId, details: { tier, title: row.title } });
  return !!row;
}

export async function pendingMembers() {
  const d = await db();
  return d.select({ t: teachers, orgName: organizations.name }).from(teachers).innerJoin(organizations, eq(organizations.id, teachers.orgId)).where(eq(teachers.membership, "pending")).orderBy(teachers.createdAt);
}

/** Signals worth a look. None of them blocks anyone by itself. */
export async function sharingAlerts() {
  const d = await db();
  const since = (days: number) => new Date(Date.now() - days * 86400_000);
  const [manyPlaces, guessing, hoarding, adminFails] = await Promise.all([
    // One account signing in from many different networks: a login may be shared.
    d
      .select({ teacherId: auditLog.actorTeacherId, email: teachers.email, places: sql<number>`count(distinct ${auditLog.details}->>'ip')::int`, signIns: count() })
      .from(auditLog)
      .innerJoin(teachers, eq(teachers.id, auditLog.actorTeacherId))
      .where(and(eq(auditLog.action, "auth.signin"), gt(auditLog.createdAt, since(30))))
      .groupBy(auditLog.actorTeacherId, teachers.email)
      .having(sql`count(distinct ${auditLog.details}->>'ip') >= 5`)
      .orderBy(desc(sql`count(distinct ${auditLog.details}->>'ip')`)),
    // Many wrong codes: guessing, or trying codes from a shared list.
    d
      .select({ email: teachers.email, fails: count() })
      .from(auditLog)
      .innerJoin(teachers, eq(teachers.id, auditLog.actorTeacherId))
      .where(and(sql`${auditLog.action} like 'code.redeem_failed%'`, gt(auditLog.createdAt, since(7))))
      .groupBy(teachers.email)
      .having(sql`count(*) >= 5`)
      .orderBy(desc(count())),
    // Several codes for the same kit on one account: codes bought for colleagues redeemed by one person.
    d
      .select({ email: teachers.email, kit: kits.name, seats: count() })
      .from(entitlements)
      .innerJoin(teachers, eq(teachers.id, entitlements.teacherId))
      .innerJoin(kits, eq(kits.id, entitlements.kitId))
      .where(and(eq(entitlements.source, "redemption"), isNull(entitlements.revokedAt)))
      .groupBy(teachers.email, kits.name)
      .having(sql`count(*) >= 2`),
    d
      .select({ who: auditLog.actorEmail, at: auditLog.createdAt, action: auditLog.action })
      .from(auditLog)
      .where(and(sql`${auditLog.action} in ('admin.login_failed', 'admin.locked')`, gt(auditLog.createdAt, since(7))))
      .orderBy(desc(auditLog.createdAt))
      .limit(30),
  ]);
  return { manyPlaces, guessing, hoarding, adminFails };
}
