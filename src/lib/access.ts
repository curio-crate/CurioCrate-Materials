import "server-only";
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { contentItems, entitlements, organizations, teachers } from "@/db/schema";

// THE ACCESS RULE (checked on the server for every lesson, file and video):
//   A teacher can view content if it is free, or if they hold an active entitlement to that kit, or an active
//   subscription (which also covers every kit's content). Subscription-tier content needs a subscription.
//   Entitlements are either PERSONAL (teacher_id set: a redeemed kit code is a seat for the one teacher who
//   redeemed it, and follows them) or SCHOOL-WIDE (teacher_id null: granted by Curiocrate in Studio, or a school/
//   district plan), which cover approved teachers of that school or its district. A teacher still waiting for
//   their school admin's approval gets only their personal entitlements, so a shared join code unlocks nothing.
// "Active" = not revoked, started, and not ended (kit access has no end date; subscriptions end with the term).

export type Content = Pick<typeof contentItems.$inferSelect, "id" | "kitId" | "requiredTier">;
export type Grants = { kitIds: Set<string>; subscription: boolean; subscriptionEndsAt: Date | null };
export type Principal =
  | { kind: "teacher"; teacherId: string; orgId: string | null; isStaff?: boolean }
  | { kind: "anonymous" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Decision =
  | { allowed: true; via: "free" | "kit" | "subscription" | "staff" }
  | { allowed: false; reason: "sign_in" | "needs_kit" | "needs_subscription" };

/** Org ids whose entitlements apply to this org: itself plus its district. */
export async function coveringOrgIds(orgId: string | null): Promise<string[]> {
  if (!orgId) return [];
  const d = await db();
  const [org] = await d.select({ id: organizations.id, parentId: organizations.parentId }).from(organizations).where(eq(organizations.id, orgId));
  if (!org) return [];
  return org.parentId ? [org.id, org.parentId] : [org.id];
}

export async function activeGrants(principal: Principal, at: Date = new Date()): Promise<Grants> {
  const empty: Grants = { kitIds: new Set(), subscription: false, subscriptionEndsAt: null };
  if (principal.kind !== "teacher" || !UUID.test(principal.teacherId)) return empty;
  const d = await db();
  const [me] = await d.select({ membership: teachers.membership }).from(teachers).where(eq(teachers.id, principal.teacherId));
  if (!me) return empty;
  const orgIds = me.membership === "active" ? await coveringOrgIds(principal.orgId) : [];
  const rows = await d
    .select({ kind: entitlements.kind, kitId: entitlements.kitId, endsAt: entitlements.endsAt })
    .from(entitlements)
    .where(
      and(
        orgIds.length ? or(eq(entitlements.teacherId, principal.teacherId), and(inArray(entitlements.orgId, orgIds), isNull(entitlements.teacherId))) : eq(entitlements.teacherId, principal.teacherId),
        isNull(entitlements.revokedAt),
        lte(entitlements.startsAt, at),
        or(isNull(entitlements.endsAt), gt(entitlements.endsAt, at)),
      ),
    );
  const grants: Grants = { kitIds: new Set(), subscription: false, subscriptionEndsAt: null };
  for (const r of rows) {
    if (r.kind === "kit" && r.kitId) grants.kitIds.add(r.kitId);
    if (r.kind === "subscription") {
      grants.subscription = true;
      if (r.endsAt && (!grants.subscriptionEndsAt || r.endsAt > grants.subscriptionEndsAt)) grants.subscriptionEndsAt = r.endsAt;
    }
  }
  return grants;
}

/** Pure decision used everywhere (and unit-tested directly). */
export function decide(content: Content, principal: Principal, grants: Grants): Decision {
  if (principal.kind !== "teacher") return { allowed: false, reason: "sign_in" };
  if (principal.isStaff) return { allowed: true, via: "staff" };
  if (content.requiredTier === "free") return { allowed: true, via: "free" };
  if (content.requiredTier === "kit_owner") {
    if (content.kitId && grants.kitIds.has(content.kitId)) return { allowed: true, via: "kit" };
    if (grants.subscription) return { allowed: true, via: "subscription" };
    return { allowed: false, reason: "needs_kit" };
  }
  return grants.subscription ? { allowed: true, via: "subscription" } : { allowed: false, reason: "needs_subscription" };
}

export async function checkAccess(principal: Principal, content: Content, at?: Date): Promise<Decision> {
  return decide(content, principal, await activeGrants(principal, at));
}

export class AccessDenied extends Error {
  constructor(public decision: Extract<Decision, { allowed: false }>) {
    super(`access denied: ${decision.reason}`);
  }
}

/** Throws AccessDenied unless the principal may view the content. */
export async function assertAccess(principal: Principal, content: Content, at?: Date) {
  const decision = await checkAccess(principal, content, at);
  if (!decision.allowed) throw new AccessDenied(decision);
  return decision;
}
