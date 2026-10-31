import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { kits, stripeEvents } from "@/db/schema";
import { sha256 } from "./crypto";
import { env } from "./env";
import { createOrder } from "./orders";

// Stripe. Live/test keys come from the environment. With no keys the app uses a local stand-in that
// signs events with a local webhook secret, so the exact same webhook verification + handling code runs.

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(env.stripe()?.secretKey ?? "sk_test_local_stand_in", { apiVersion: undefined as unknown as Stripe.LatestApiVersion, maxNetworkRetries: 1 });
  return client;
}

export function webhookSecret() {
  return env.stripe()?.webhookSecret ?? `whsec_local_${sha256(env.sessionSecret()).slice(0, 32)}`;
}

export function isStripeLive() {
  return !!env.stripe();
}

/** Verifies the Stripe-Signature header and parses the event. Throws on a bad signature. */
export function verifyWebhook(payload: string, signature: string | null) {
  if (!signature) throw new Error("missing signature");
  return stripe().webhooks.constructEvent(payload, signature, webhookSecret());
}

/** For the local stand-in and tests: a correctly signed Stripe test-mode event. */
export function signTestEvent(payload: string) {
  return stripe().webhooks.generateTestHeaderString({ payload, secret: webhookSecret() });
}

/** Handles one Stripe event exactly once (stripe_events records processed ids). */
export async function handleStripeEvent(event: Stripe.Event, extra?: (e: Stripe.Event) => Promise<unknown>) {
  const d = await db();
  const inserted = await d.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning();
  if (!inserted.length) return { duplicate: true };

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.kind === "kit_order") {
      const [kit] = await d.select().from(kits).where(eq(kits.slug, s.metadata.kitSlug ?? ""));
      if (!kit) throw new Error(`unknown kit ${s.metadata.kitSlug}`);
      const quantity = Math.max(1, Math.min(500, Number(s.metadata.quantity ?? 1)));
      const r = await createOrder(
        { teacherId: null, email: "stripe" },
        { source: "card", reference: s.id, customerName: s.customer_details?.name ?? null, customerEmail: s.customer_details?.email ?? s.customer_email ?? null, notes: "Card payment via Stripe Checkout", lines: [{ kitId: kit.id, quantity }] },
      );
      return { order: r.order.id, codes: r.codes.length };
    }
  }
  if (extra) return { handled: await extra(event) };
  return { ignored: event.type };
}
