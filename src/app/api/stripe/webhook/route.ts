import type { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { handleStripeEvent, verifyWebhook } from "@/lib/payments";
import { handleSubscriptionEvent } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  let event;
  try {
    event = verifyWebhook(payload, req.headers.get("stripe-signature"));
  } catch {
    return json({ error: "bad signature" }, 400);
  }
  try {
    return json(await handleStripeEvent(event, handleSubscriptionEvent));
  } catch (e) {
    console.error("stripe webhook failed", event.type, e);
    return json({ error: "handler failed" }, 500);
  }
}
