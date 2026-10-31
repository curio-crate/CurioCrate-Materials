import "server-only";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, authAccounts, classes, entitlements, kits, organizations, sessions, teachers } from "@/db/schema";

// A teacher's own data. It is kept (in the cloud database) for as long as the account exists, and the teacher can
// download it or delete the account themselves at /account.

export async function accountData(teacherId: string) {
  const d = await db();
  const [t] = await d.select({ t: teachers, org: organizations }).from(teachers).leftJoin(organizations, eq(organizations.id, teachers.orgId)).where(eq(teachers.id, teacherId));
  if (!t) return null;
  const [signIns, seats, myClasses, [devices]] = await Promise.all([
    d.select({ provider: authAccounts.provider, since: authAccounts.createdAt }).from(authAccounts).where(eq(authAccounts.teacherId, teacherId)),
    d.select({ kit: kits.name, source: entitlements.source, since: entitlements.startsAt, revokedAt: entitlements.revokedAt }).from(entitlements).leftJoin(kits, eq(kits.id, entitlements.kitId)).where(eq(entitlements.teacherId, teacherId)).orderBy(asc(entitlements.startsAt)),
    d.select({ name: classes.name, classCode: classes.classCode, createdAt: classes.createdAt }).from(classes).where(eq(classes.teacherId, teacherId)),
    d.select({ n: count() }).from(sessions).where(eq(sessions.teacherId, teacherId)),
  ]);
  return {
    profile: { name: t.t.name, email: t.t.email, createdAt: t.t.createdAt, lastSeenAt: t.t.lastSeenAt },
    school: t.org ? { name: t.org.name, membership: t.t.membership, schoolAdmin: t.t.isOrgAdmin } : null,
    signIns,
    kitSeats: seats.map((s) => ({ kit: s.kit, source: s.source, since: s.since, active: !s.revokedAt })),
    classes: myClasses,
    signedInDevices: devices.n,
  };
}

/**
 * Deletes a teacher account and everything that belongs to it: sign-in links, sessions, personal kit seats and
 * subscriptions, classes (with their anonymous student devices, lab results and Curie chats), views and video
 * usage, all via ON DELETE CASCADE. Their email is scrubbed from the audit log. Redeemed codes stay "used" (they
 * can't be redeemed again) but no longer point at the person. If they were their school's only admin, the
 * longest-serving approved colleague becomes admin.
 */
export async function deleteTeacherAccount(teacherId: string) {
  const d = await db();
  const [t] = await d.select().from(teachers).where(eq(teachers.id, teacherId));
  if (!t) return false;
  await d.transaction(async (tx) => {
    await tx.update(auditLog).set({ actorEmail: null }).where(eq(auditLog.actorTeacherId, teacherId));
    await tx.update(auditLog).set({ details: {} }).where(sql`position(${t.email} in ${auditLog.details}::text) > 0`);
    await tx.delete(teachers).where(eq(teachers.id, teacherId));
    if (t.orgId && t.isOrgAdmin) {
      const [{ n }] = await tx.select({ n: count() }).from(teachers).where(and(eq(teachers.orgId, t.orgId), eq(teachers.isOrgAdmin, true)));
      if (n === 0) {
        const [next] = await tx.select({ id: teachers.id }).from(teachers).where(and(eq(teachers.orgId, t.orgId), eq(teachers.membership, "active"), ne(teachers.id, teacherId))).orderBy(asc(teachers.createdAt)).limit(1);
        if (next) await tx.update(teachers).set({ isOrgAdmin: true }).where(eq(teachers.id, next.id));
      }
    }
    await tx.insert(auditLog).values({ action: "teacher.account_deleted", targetType: "teacher", targetId: teacherId, orgId: t.orgId, details: {} });
  });
  return true;
}
