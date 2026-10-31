import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orders, redemptionCodes } from "@/db/schema";
import { handleStripeEvent, signTestEvent, verifyWebhook } from "@/lib/payments";
import { freshDb } from "./helpers/db";

function checkoutEvent(id: string, sessionId: string) {
  return JSON.stringify({
    id,
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: { id: sessionId, object: "checkout.session", metadata: { kind: "kit_order", kitSlug: "luminol", quantity: "3" }, customer_details: { email: "buyer@school.org", name: "Buyer" } } },
  });
}

describe("card payments (Stripe test mode)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("rejects an unsigned or tampered webhook", () => {
    const payload = checkoutEvent("evt_1", "cs_test_1");
    expect(() => verifyWebhook(payload, null)).toThrow();
    const sig = signTestEvent(payload);
    expect(() => verifyWebhook(payload.replace("3", "300"), sig)).toThrow();
  });

  it("a paid checkout creates a card order with one code per kit, exactly once", async () => {
    const payload = checkoutEvent("evt_2", "cs_test_2");
    const event = verifyWebhook(payload, signTestEvent(payload));
    const r = await handleStripeEvent(event);
    expect(r).toMatchObject({ codes: 3 });
    expect(await handleStripeEvent(event)).toEqual({ duplicate: true });
    // Stripe can also send a different event id for the same session; still one order.
    const again = checkoutEvent("evt_3", "cs_test_2");
    await handleStripeEvent(verifyWebhook(again, signTestEvent(again)));
    const d = await db();
    const rows = await d.select().from(orders).where(eq(orders.reference, "cs_test_2"));
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("card");
    expect(await d.select().from(redemptionCodes).where(eq(redemptionCodes.orderId, rows[0].id))).toHaveLength(3);
  });
});
