import "server-only";
import { and, count, eq, gt, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, entitlements, kits, organizations, redemptionCodes, teachers } from "@/db/schema";
import { isWellFormedCode, normalizeCode } from "./codes";
import { notifyAdminsOfRisk } from "./team/notify";

export type RedeemResult =
  | { ok: true; kit: { id: string; slug: string; name: string }; orgName: string; alreadyHad: boolean }
  | { ok: false; error: "invalid" | "not_found" | "already_redeemed" | "already_yours" | "void" | "no_school" | "rate_limited"; message: string };

const MESSAGES: Record<Exclude<RedeemResult, { ok: true }>["error"], string> = {
  invalid: "That doesn't look like a kit code. Codes look like LMN-7K3D-Q9TX-2MPR.",
  not_found: "We couldn't find that code. Check each character, or contact support with your order number.",
  already_redeemed: "This code has already been used by another teacher. Each code unlocks one teacher's account, once. Contact support if this is your kit.",
  already_yours: "You already redeemed this code. The kit is unlocked on your account.",
  void: "This code was replaced or cancelled. Use the newer code support sent you, or contact support.",
  no_school: "Join or set up your school before redeeming.",
  rate_limited: "Too many attempts. Please wait 15 minutes and try again, or contact support.",
};

const MAX_FAILED_PER_15_MIN = 10;

function fail(error: Exclude<RedeemResult, { ok: true }>["error"]): RedeemResult {
  return { ok: false, error, message: MESSAGES[error] };
}

/**
 * Redeem a one-time kit code. The code becomes a personal seat for the redeeming teacher only: colleagues need
 * their own code (or a school-wide license granted in Studio), so passing a code around unlocks nothing extra.
 * Exactly-once is enforced by a single conditional UPDATE (status = 'active' → 'redeemed'). In PostgreSQL a
 * concurrent second UPDATE waits on the row lock, re-checks the WHERE clause after the first commits and
 * matches zero rows. A unique index on entitlements(source, source_ref) is a second guard: one entitlement per code.
 */
export async function redeemCode(teacherId: string, rawCode: string): Promise<RedeemResult> {
  const d = await db();
  const [teacher] = await d.select().from(teachers).where(eq(teachers.id, teacherId));
  if (!teacher) return fail("invalid");

  const since = new Date(Date.now() - 15 * 60_000);
  const [{ n }] = await d
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.actorTeacherId, teacherId), like(auditLog.action, "code.redeem_failed%"), gt(auditLog.createdAt, since)));
  if (n >= MAX_FAILED_PER_15_MIN) return fail("rate_limited");

  const code = normalizeCode(rawCode);
  const logFail = async (reason: string) => {
    await d.insert(auditLog).values({ actorTeacherId: teacherId, actorEmail: teacher.email, action: `code.redeem_failed.${reason}`, targetType: "redemption_code", targetId: code.slice(0, 3) + "…", orgId: teacher.orgId, details: {} });
    if (n + 1 === MAX_FAILED_PER_15_MIN) await notifyAdminsOfRisk(`Possible code guessing: ${teacher.email}`, `${MAX_FAILED_PER_15_MIN} wrong kit codes in 15 minutes. Their code entry is paused for 15 minutes.`);
  };

  if (!isWellFormedCode(code)) {
    await logFail("invalid");
    return fail("invalid");
  }
  if (!teacher.orgId) return fail("no_school");
  const orgId = teacher.orgId;

  const result = await d.transaction(async (tx) => {
    const [claimed] = await tx
      .update(redemptionCodes)
      .set({ status: "redeemed", redeemedAt: new Date(), redeemedByTeacherId: teacherId, redeemedOrgId: orgId })
      .where(and(eq(redemptionCodes.code, code), eq(redemptionCodes.status, "active")))
      .returning();
    if (!claimed) return null;
    const [already] = await tx
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(and(eq(entitlements.teacherId, teacherId), eq(entitlements.kitId, claimed.kitId), eq(entitlements.kind, "kit"), isNull(entitlements.revokedAt)));
    await tx.insert(entitlements).values({ orgId, teacherId, kind: "kit", kitId: claimed.kitId, source: "redemption", sourceRef: claimed.id, endsAt: null });
    await tx.insert(auditLog).values({ actorTeacherId: teacherId, actorEmail: teacher.email, action: "code.redeem", targetType: "redemption_code", targetId: claimed.id, orgId, details: { kitId: claimed.kitId } });
    return { claimed, alreadyHad: !!already };
  });

  if (!result) {
    const [existing] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    if (!existing) {
      await logFail("not_found");
      return fail("not_found");
    }
    if (existing.status === "void") return fail("void");
    return fail(existing.redeemedByTeacherId === teacherId ? "already_yours" : "already_redeemed");
  }

  const [kit] = await d.select({ id: kits.id, slug: kits.slug, name: kits.name }).from(kits).where(eq(kits.id, result.claimed.kitId));
  const [org] = await d.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId));
  return { ok: true, kit, orgName: org.name, alreadyHad: result.alreadyHad };
}
