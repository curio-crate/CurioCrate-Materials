import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { auditLog, entitlements, organizations, subscriptions } from "@/db/schema";

// Subscriptions: Stripe is the source of truth. customer.subscription.created/updated set (or extend) a
// subscription entitlement whose ends_at = the paid period end; .deleted ends it. Access stops at ends_at
// automatically because the access rule only counts entitlements that have not ended.

type SubLike = {
  id: string;
  status: string;
  customer?: string | null;
  current_period_end?: number;
  ended_at?: number | null;
  items?: { data?: { current_period_end?: number }[] };
  metadata?: Record<string, string>;
};

function periodEnd(s: SubLike) {
  const t = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return t ? new Date(t * 1000) : new Date();
}

export async function applySubscription(s: SubLike, ended = false) {
  const d = await db();
  const meta = s.metadata ?? {};
  const orgId = meta.orgId;
  if (!orgId) throw new Error("subscription without orgId metadata");
  const [org] = await d.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) throw new Error("unknown org");
  const active = !ended && ["active", "trialing", "past_due"].includes(s.status);
  const endsAt = ended || !active ? new Date((s.ended_at ?? Math.floor(Date.now() / 1000)) * 1000) : periodEnd(s);
  const plan = meta.plan ?? "school";
  const teacherId = plan === "teacher" ? meta.teacherId || null : null;

  await d
    .insert(subscriptions)
    .values({ orgId, teacherId, plan, stripeCustomerId: s.customer ?? null, stripeSubscriptionId: s.id, status: ended ? "canceled" : s.status, currentPeriodEnd: endsAt })
    .onConflictDoUpdate({ target: subscriptions.stripeSubscriptionId, set: { status: ended ? "canceled" : s.status, currentPeriodEnd: endsAt } });
  await d
    .insert(entitlements)
    .values({ orgId, teacherId, kind: "subscription", plan, source: "stripe", sourceRef: s.id, endsAt })
    .onConflictDoUpdate({ target: [entitlements.source, entitlements.sourceRef], set: { endsAt, plan } });
  await d.insert(auditLog).values({ actorEmail: "stripe", action: ended ? "subscription.end" : "subscription.update", targetType: "subscription", targetId: s.id, orgId, details: { plan, status: s.status, endsAt: endsAt.toISOString() } });
}

export async function handleSubscriptionEvent(event: Stripe.Event): Promise<unknown> {
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await applySubscription(event.data.object as unknown as SubLike);
    return "subscription_applied";
  }
  if (event.type === "customer.subscription.deleted") {
    await applySubscription(event.data.object as unknown as SubLike, true);
    return "subscription_ended";
  }
  return null;
}

/** Cron: mark subscriptions whose term has passed as ended (access already stops at ends_at). */
export async function expireSubscriptions(now = new Date()) {
  const d = await db();
  const rows = await d.select().from(subscriptions);
  let n = 0;
  for (const r of rows) {
    if (r.currentPeriodEnd <= now && r.status !== "ended" && r.status !== "canceled") {
      await d.update(subscriptions).set({ status: "ended" }).where(eq(subscriptions.id, r.id));
      n++;
    }
  }
  return n;
}
