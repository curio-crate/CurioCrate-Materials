import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { env } from "@/lib/env";
import { redirectTo, sameOrigin } from "@/lib/http";
import { handleStripeEvent, isStripeLive, signTestEvent, stripe, verifyWebhook } from "@/lib/payments";
import { planById } from "@/lib/plans";
import { handleSubscriptionEvent } from "@/lib/subscriptions";

// Start a subscription. Live: Stripe Checkout (mode=subscription). Without Stripe keys: a local checkout
// stand-in that sends a correctly signed Stripe test-mode event through the same webhook handler.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const v = await getViewer();
  if (!v) return redirectTo("/signin?next=/plans");
  if (!v.org) return redirectTo("/onboarding?next=/plans");
  const plan = planById(String((await req.formData()).get("plan") ?? ""));
  if (!plan) return redirectTo("/plans");
  const orgId = plan.id === "district" ? (v.district?.id ?? v.org.parentId ?? v.org.id) : v.org.id;
  const metadata = { orgId, plan: plan.id, teacherId: v.teacher.id };

  if (isStripeLive()) {
    const price = process.env[plan.priceEnv];
    if (!price) return new NextResponse(`${plan.priceEnv} is not set`, { status: 503 });
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: v.teacher.email,
      metadata,
      subscription_data: { metadata },
      success_url: `${env.appUrl()}/plans?status=success`,
      cancel_url: `${env.appUrl()}/plans`,
    });
    return NextResponse.redirect(session.url!, 303);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_local_${crypto.randomUUID()}`,
    object: "event",
    type: "customer.subscription.created",
    livemode: false,
    data: { object: { id: `sub_local_${crypto.randomUUID()}`, object: "subscription", status: "active", customer: `cus_local_${v.teacher.id.slice(0, 8)}`, current_period_end: now + 365 * 86400, metadata } },
  });
  await handleStripeEvent(verifyWebhook(payload, signTestEvent(payload)), handleSubscriptionEvent);
  return redirectTo("/plans?status=success");
}
