import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { entitlements, organizations, teachers } from "@/db/schema";
import { checkAccess, decide, type Grants } from "@/lib/access";
import { grantKitAccess, revokeEntitlement } from "@/lib/entitlements";
import { redeemCode } from "@/lib/redeem";
import { decideMembership } from "@/lib/teachers";
import { freshDb } from "./helpers/db";
import { addColleague, codesFor, content, kit, makeTeacher, principal } from "./helpers/factory";

const none: Grants = { kitIds: new Set(), subscription: false, subscriptionEndsAt: null };

describe("access rule (pure decision)", () => {
  const free = { id: "c1", kitId: "k1", requiredTier: "free" as const };
  const kitOnly = { id: "c2", kitId: "k1", requiredTier: "kit_owner" as const };
  const sub = { id: "c3", kitId: "k1", requiredTier: "subscription" as const };
  const t = { kind: "teacher" as const, teacherId: "t", orgId: "o" };

  it("requires an account even for free content", () => {
    expect(decide(free, { kind: "anonymous" }, none)).toEqual({ allowed: false, reason: "sign_in" });
  });
  it("lets any teacher open free content", () => {
    expect(decide(free, t, none).allowed).toBe(true);
  });
  it("needs the kit (or a subscription) for kit-owner content", () => {
    expect(decide(kitOnly, t, none)).toEqual({ allowed: false, reason: "needs_kit" });
    expect(decide(kitOnly, t, { ...none, kitIds: new Set(["k2"]) })).toEqual({ allowed: false, reason: "needs_kit" });
    expect(decide(kitOnly, t, { ...none, kitIds: new Set(["k1"]) })).toEqual({ allowed: true, via: "kit" });
    expect(decide(kitOnly, t, { ...none, subscription: true })).toEqual({ allowed: true, via: "subscription" });
  });
  it("needs a subscription for subscription content, even with the kit", () => {
    expect(decide(sub, t, { ...none, kitIds: new Set(["k1"]) })).toEqual({ allowed: false, reason: "needs_subscription" });
    expect(decide(sub, t, { ...none, subscription: true }).allowed).toBe(true);
  });
});

describe("access rule (database)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("a teacher without access cannot get kit-owner or subscription content", async () => {
    const t = await makeTeacher();
    expect((await checkAccess(principal(t), await content("luminol-a1-why-it-glows"))).allowed).toBe(false);
    expect((await checkAccess(principal(t), await content("luminol-why-it-glows-video"))).allowed).toBe(false);
    expect((await checkAccess(principal(t), await content("luminol-a1-notes"))).allowed).toBe(false);
    expect((await checkAccess(principal(t), await content("luminol-training-walkthrough"))).allowed).toBe(false);
    expect((await checkAccess(principal(t), await content("luminol-a0-predict"))).allowed).toBe(true);
  });

  it("a redeemed code unlocks that kit for the redeeming teacher only, and only that kit", async () => {
    const t = await makeTeacher();
    const colleague = await addColleague(t.orgId!, { approve: true });
    const outsider = await makeTeacher();
    const [code] = await codesFor("luminol");
    expect((await redeemCode(t.id, code)).ok).toBe(true);
    expect((await checkAccess(principal(t), await content("luminol-a1-why-it-glows"))).allowed).toBe(true);
    expect((await checkAccess(principal(t), await content("luminol-why-it-glows-video"))).allowed).toBe(true);
    expect((await checkAccess(principal(t), await content("circuits-series-parallel"))).allowed).toBe(false);
    for (const who of [colleague, outsider]) expect((await checkAccess(principal(who), await content("luminol-a1-why-it-glows"))).allowed).toBe(false);
  });

  it("a school-wide license covers approved colleagues, not teachers still waiting for approval", async () => {
    const t = await makeTeacher();
    const approved = await addColleague(t.orgId!, { approve: true });
    const waiting = await addColleague(t.orgId!);
    expect(waiting.membership).toBe("pending");
    const k = await kit("luminol");
    await grantKitAccess({ teacherId: null, email: "studio" }, t.orgId!, k.id, "school license");
    const lesson = await content("luminol-a1-why-it-glows");
    expect((await checkAccess(principal(approved), lesson)).allowed).toBe(true);
    expect((await checkAccess(principal(waiting), lesson)).allowed).toBe(false);
    await decideMembership({ teacherId: t.id, email: t.email, orgId: t.orgId }, waiting.id, true);
    expect((await checkAccess(principal(waiting), lesson)).allowed).toBe(true);
  });

  it("a personal seat follows the teacher to another school", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    const other = await makeTeacher();
    const d = await db();
    await d.update(teachers).set({ orgId: other.orgId }).where(eq(teachers.id, t.id));
    expect((await checkAccess({ kind: "teacher", teacherId: t.id, orgId: other.orgId }, await content("luminol-a1-why-it-glows"))).allowed).toBe(true);
  });

  it("kit access never expires; subscription access ends with the term", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    const farFuture = new Date(Date.now() + 50 * 365 * 86400_000);
    expect((await checkAccess(principal(t), await content("luminol-a1-why-it-glows"), farFuture)).allowed).toBe(true);

    const d = await db();
    const end = new Date(Date.now() + 30 * 86400_000);
    await d.insert(entitlements).values({ orgId: t.orgId!, kind: "subscription", plan: "school", source: "manual", sourceRef: `sub-${t.id}`, endsAt: end });
    const training = await content("luminol-training-walkthrough");
    expect((await checkAccess(principal(t), training)).allowed).toBe(true);
    expect((await checkAccess(principal(t), training, new Date(end.getTime() + 1000))).allowed).toBe(false);
  });

  it("a district's entitlement covers its schools", async () => {
    const t = await makeTeacher();
    const d = await db();
    const [district] = await d.insert(organizations).values({ name: "Test USD", type: "district", joinCode: "DSTRCT" }).returning();
    const { eq } = await import("drizzle-orm");
    await d.update(organizations).set({ parentId: district.id }).where(eq(organizations.id, t.orgId!));
    const k = await kit("circuits");
    await grantKitAccess({ teacherId: null }, district.id, k.id, "district purchase order");
    expect((await checkAccess(principal(t), await content("circuits-series-parallel"))).allowed).toBe(true);
  });

  it("revoked access stops working immediately", async () => {
    const t = await makeTeacher();
    const k = await kit("clean-water");
    const e = await grantKitAccess({ teacherId: null }, t.orgId!, k.id, "test");
    const lesson = await content("water-design-a-filter");
    expect((await checkAccess(principal(t), lesson)).allowed).toBe(true);
    await revokeEntitlement({ teacherId: null }, e.id, "refund");
    expect((await checkAccess(principal(t), lesson)).allowed).toBe(false);
  });
});
