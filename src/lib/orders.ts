import "server-only";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { auditLog, kits, orderLines, orders, organizations, redemptionCodes, teachers } from "@/db/schema";
import { newRedemptionCode, normalizeCode } from "./codes";
import type { Actor } from "./entitlements";

export type OrderSource = "card" | "purchase_order" | "distributor" | "manual";
export type OrderInput = {
  source: OrderSource;
  reference?: string | null;
  orgId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  lines: { kitId: string; quantity: number }[];
};

export const MAX_CODES_PER_ORDER = 5000;

async function insertCodes(tx: Tx, orderId: string, kitId: string, kitCode: string, quantity: number) {
  const values = Array.from({ length: quantity }, () => ({ code: newRedemptionCode(kitCode), orderId, kitId }));
  const out: (typeof redemptionCodes.$inferSelect)[] = [];
  for (let i = 0; i < values.length; i += 500) out.push(...(await tx.insert(redemptionCodes).values(values.slice(i, i + 500)).returning()));
  return out;
}

/** Creates an order and generates one redemption code per kit (bulk). Idempotent on (source, reference). */
export async function createOrder(actor: Actor, input: OrderInput) {
  const total = input.lines.reduce((n, l) => n + l.quantity, 0);
  if (!input.lines.length || input.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) throw new Error("Each line needs a whole-number quantity of at least 1.");
  if (total > MAX_CODES_PER_ORDER) throw new Error(`An order can have at most ${MAX_CODES_PER_ORDER} codes.`);
  const d = await db();
  const reference = input.reference?.trim() || null;
  if (reference) {
    const [dup] = await d.select().from(orders).where(and(eq(orders.source, input.source), eq(orders.reference, reference)));
    if (dup) return { order: dup, codes: await d.select().from(redemptionCodes).where(eq(redemptionCodes.orderId, dup.id)), duplicate: true };
  }
  const kitRows = await d.select().from(kits).where(inArray(kits.id, input.lines.map((l) => l.kitId)));
  const byId = new Map(kitRows.map((k) => [k.id, k]));
  if (input.lines.some((l) => !byId.has(l.kitId))) throw new Error("Unknown kit.");

  return d.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        source: input.source, reference, orgId: input.orgId ?? null, customerName: input.customerName?.trim() || null,
        customerEmail: input.customerEmail?.trim().toLowerCase() || null, notes: input.notes?.trim() || null, createdByTeacherId: actor.teacherId,
      })
      .returning();
    const codes: (typeof redemptionCodes.$inferSelect)[] = [];
    for (const l of input.lines) {
      await tx.insert(orderLines).values({ orderId: order.id, kitId: l.kitId, quantity: l.quantity });
      codes.push(...(await insertCodes(tx, order.id, l.kitId, byId.get(l.kitId)!.code, l.quantity)));
    }
    await tx.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "order.create", targetType: "order", targetId: order.id, orgId: order.orgId, details: { source: order.source, reference, codes: codes.length } });
    return { order, codes, duplicate: false };
  });
}

/**
 * Reissue a lost code: the old (unredeemed) code is voided and a new code for the same kit and order
 * is created and linked to it. A code that was already redeemed can't be reissued; use "fix access" instead.
 */
export async function reissueCode(actor: Actor, codeId: string, reason: string) {
  const d = await db();
  return d.transaction(async (tx) => {
    const [old] = await tx
      .update(redemptionCodes)
      .set({ status: "void", voidReason: `reissued: ${reason}` })
      .where(and(eq(redemptionCodes.id, codeId), eq(redemptionCodes.status, "active")))
      .returning();
    if (!old) return { ok: false as const, error: "Only unredeemed, active codes can be reissued." };
    const [kit] = await tx.select().from(kits).where(eq(kits.id, old.kitId));
    const [fresh] = await tx.insert(redemptionCodes).values({ code: newRedemptionCode(kit.code), orderId: old.orderId, kitId: old.kitId, reissuedFromId: old.id }).returning();
    await tx.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "code.reissue", targetType: "redemption_code", targetId: fresh.id, details: { from: old.code, to: fresh.code, reason } });
    return { ok: true as const, old, fresh };
  });
}

export async function voidCode(actor: Actor, codeId: string, reason: string) {
  const d = await db();
  const [row] = await d.update(redemptionCodes).set({ status: "void", voidReason: reason }).where(and(eq(redemptionCodes.id, codeId), eq(redemptionCodes.status, "active"))).returning();
  if (row) await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: "code.void", targetType: "redemption_code", targetId: row.id, details: { reason } });
  return row ?? null;
}

/** Support lookup: by code (any format), order reference, customer/teacher email, or school name. */
export async function lookupCodes(query: string, limit = 50) {
  const d = await db();
  const q = query.trim();
  if (!q) return [];
  const normalized = normalizeCode(q);
  const like = `%${q}%`;
  return d
    .select({
      code: redemptionCodes,
      kitName: kits.name,
      order: { id: orders.id, source: orders.source, reference: orders.reference, customerName: orders.customerName, customerEmail: orders.customerEmail },
      orgName: organizations.name,
      redeemedBy: teachers.email,
    })
    .from(redemptionCodes)
    .innerJoin(kits, eq(kits.id, redemptionCodes.kitId))
    .innerJoin(orders, eq(orders.id, redemptionCodes.orderId))
    .leftJoin(organizations, eq(organizations.id, redemptionCodes.redeemedOrgId))
    .leftJoin(teachers, eq(teachers.id, redemptionCodes.redeemedByTeacherId))
    .where(
      or(
        eq(redemptionCodes.code, normalized),
        ilike(redemptionCodes.code, `${normalized}%`),
        ilike(orders.reference, like),
        ilike(orders.customerEmail, like),
        ilike(orders.customerName, like),
        ilike(teachers.email, like),
        ilike(organizations.name, like),
      ),
    )
    .orderBy(desc(redemptionCodes.createdAt))
    .limit(limit);
}

export async function getOrderWithCodes(orderId: string) {
  const d = await db();
  const [order] = await d.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  const codes = await d
    .select({ code: redemptionCodes, kitName: kits.name, kitSlug: kits.slug, orgName: organizations.name })
    .from(redemptionCodes)
    .innerJoin(kits, eq(kits.id, redemptionCodes.kitId))
    .leftJoin(organizations, eq(organizations.id, redemptionCodes.redeemedOrgId))
    .where(eq(redemptionCodes.orderId, orderId))
    .orderBy(redemptionCodes.createdAt);
  const [org] = order.orgId ? await d.select().from(organizations).where(eq(organizations.id, order.orgId)) : [];
  return { order, codes, org: org ?? null };
}

export async function recentOrders(limit = 20) {
  const d = await db();
  return d.select({ order: orders, orgName: organizations.name }).from(orders).leftJoin(organizations, eq(organizations.id, orders.orgId)).orderBy(desc(orders.createdAt)).limit(limit);
}
