import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { env } from "@/lib/env";
import { redirectTo, sameOrigin } from "@/lib/http";
import { isStripeLive, stripe } from "@/lib/payments";
import { manageableSubscriptions } from "@/lib/subscriptions";

// Online cancellation (California's automatic renewal law requires it for subscriptions bought online): sends the
// teacher to Stripe's billing portal, where they can cancel, change the card or download invoices.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const v = await getViewer();
  if (!v) return redirectTo("/signin?next=/account");
  const [sub] = (await manageableSubscriptions(v)).filter((s) => s.stripeCustomerId);
  if (!sub) return redirectTo(`/account?err=${encodeURIComponent("There's no subscription on your account to manage.")}`);
  if (!isStripeLive()) return redirectTo(`/account?err=${encodeURIComponent(`Online billing isn't connected here. Email contact@curiocrate.org to cancel.`)}`);
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId!, return_url: `${env.appUrl()}/account` });
  return NextResponse.redirect(session.url, 303);
}
