import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, entitlements, kits } from "@/db/schema";

export type Actor = { teacherId: string | null; email?: string | null };

export async function listEntitlements(orgId: string) {
  const d = await db();
  return d
    .select({ e: entitlements, kitName: kits.name, kitSlug: kits.slug })
    .from(entitlements)
    .leftJoin(kits, eq(kits.id, entitlements.kitId))
    .where(eq(entitlements.orgId, orgId))
    .orderBy(desc(entitlements.createdAt));
}

/** Support tool: grant a school kit access by hand (e.g. a lost code that can't be found). Never expires. */
export async function grantKitAccess(actor: Actor, orgId: string, kitId: string, reason: string) {
  const d = await db();
  const [existing] = await d
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.orgId, orgId), eq(entitlements.kitId, kitId), eq(entitlements.kind, "kit"), isNull(entitlements.revokedAt)));
  if (existing) return existing;
  const [row] = await d.insert(entitlements).values({ orgId, kind: "kit", kitId, source: "manual", sourceRef: null }).returning();
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "entitlement.grant", targetType: "entitlement", targetId: row.id, orgId, details: { kitId, reason } });
  return row;
}

export async function revokeEntitlement(actor: Actor, entitlementId: string, reason: string) {
  const d = await db();
  const [row] = await d.update(entitlements).set({ revokedAt: new Date(), revokedReason: reason }).where(and(eq(entitlements.id, entitlementId), isNull(entitlements.revokedAt))).returning();
  if (row) await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "entitlement.revoke", targetType: "entitlement", targetId: row.id, orgId: row.orgId, details: { reason } });
  return row ?? null;
}

export async function restoreEntitlement(actor: Actor, entitlementId: string) {
  const d = await db();
  const [row] = await d.update(entitlements).set({ revokedAt: null, revokedReason: null }).where(eq(entitlements.id, entitlementId)).returning();
  if (row) await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "entitlement.restore", targetType: "entitlement", targetId: row.id, orgId: row.orgId, details: {} });
  return row ?? null;
}
