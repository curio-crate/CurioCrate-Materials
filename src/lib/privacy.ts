import "server-only";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, contentViews, organizations, orders, redemptionCodes, teachers, videoPlaybacks } from "@/db/schema";

/**
 * Contract end: deletes everything belonging to a school (or a district and all its schools):
 * teachers (and their sessions, sign-in links, classes, student sessions, lab runs, Curie chats via cascade),
 * entitlements, subscriptions, usage and views, the organization itself. Orders are financial records, so they
 * are kept but detached and stripped of customer name/email; redeemed codes keep their status but lose the
 * link to the deleted teacher and school.
 */
export async function deleteOrganizationData(actor: { teacherId: string | null; email: string }, orgId: string) {
  const d = await db();
  const children = await d.select({ id: organizations.id }).from(organizations).where(eq(organizations.parentId, orgId));
  const orgIds = [orgId, ...children.map((c) => c.id)];
  const staff = await d.select({ id: teachers.id }).from(teachers).where(inArray(teachers.orgId, orgIds));
  const teacherIds = staff.map((t) => t.id);

  await d.transaction(async (tx) => {
    await tx.update(redemptionCodes).set({ redeemedByTeacherId: null, redeemedOrgId: null }).where(inArray(redemptionCodes.redeemedOrgId, orgIds));
    await tx.update(orders).set({ orgId: null, customerName: null, customerEmail: null, notes: null }).where(inArray(orders.orgId, orgIds));
    await tx.delete(videoPlaybacks).where(inArray(videoPlaybacks.orgId, orgIds));
    await tx.delete(contentViews).where(inArray(contentViews.orgId, orgIds));
    await tx.delete(auditLog).where(or(inArray(auditLog.orgId, orgIds), teacherIds.length ? inArray(auditLog.actorTeacherId, teacherIds) : undefined));
    if (teacherIds.length) await tx.delete(teachers).where(inArray(teachers.id, teacherIds)); // cascades: sessions, auth accounts, classes → students, lab runs, chats
    await tx.delete(organizations).where(inArray(organizations.id, orgIds)); // cascades: entitlements, subscriptions, remaining classes
  });
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "org.delete_all_data", targetType: "organization", targetId: orgId, details: { schools: orgIds.length, teachers: teacherIds.length } });
  return { orgs: orgIds.length, teachers: teacherIds.length };
}
