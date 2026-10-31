import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { entitlements, redemptionCodes } from "@/db/schema";
import { formatCode } from "@/lib/codes";
import { reissueCode } from "@/lib/orders";
import { redeemCode } from "@/lib/redeem";
import { freshDb } from "./helpers/db";
import { addColleague, codesFor, makeTeacher } from "./helpers/factory";

describe("kit code redemption", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("redeems a code for the teacher's school, accepting dashes, spaces and lowercase", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    const r = await redeemCode(t.id, ` ${formatCode(code).toLowerCase()} `);
    expect(r.ok).toBe(true);
    const d = await db();
    const [row] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    expect(row.status).toBe("redeemed");
    expect(row.redeemedOrgId).toBe(t.orgId);
  });

  it("a code can only be used once", async () => {
    const a = await makeTeacher();
    const b = await makeTeacher();
    const [code] = await codesFor("luminol");
    expect((await redeemCode(a.id, code)).ok).toBe(true);
    const again = await redeemCode(b.id, code);
    expect(again).toMatchObject({ ok: false, error: "already_redeemed" });
    const sameSchool = await redeemCode(a.id, code);
    expect(sameSchool).toMatchObject({ ok: false, error: "already_yours" });
  });

  it("two attempts at the same moment: exactly one wins and exactly one entitlement exists", async () => {
    const teachers = await Promise.all(Array.from({ length: 8 }, () => makeTeacher()));
    const [code] = await codesFor("luminol");
    const results = await Promise.all(teachers.map((t) => redeemCode(t.id, code)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "already_redeemed")).toHaveLength(7);
    const d = await db();
    const [row] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    const ents = await d.select().from(entitlements).where(eq(entitlements.sourceRef, row.id));
    expect(ents).toHaveLength(1);
  });

  it("the database refuses a second entitlement for the same code even if app logic were bypassed", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    await redeemCode(t.id, code);
    const d = await db();
    const [row] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    await expect(d.insert(entitlements).values({ orgId: t.orgId!, kind: "kit", kitId: row.kitId, source: "redemption", sourceRef: row.id })).rejects.toThrow();
  });

  it("a code is a seat for the redeeming teacher: a colleague can't reuse it", async () => {
    const t = await makeTeacher();
    const c = await addColleague(t.orgId!, { approve: true });
    const [code] = await codesFor("circuits");
    expect((await redeemCode(t.id, code)).ok).toBe(true);
    const d = await db();
    const ents = await d.select().from(entitlements).where(eq(entitlements.orgId, t.orgId!));
    expect(ents.filter((e) => e.kind === "kit").every((e) => e.teacherId === t.id)).toBe(true);
    expect(await redeemCode(c.id, code)).toMatchObject({ ok: false, error: "already_redeemed" });
    expect(await redeemCode(t.id, code)).toMatchObject({ ok: false, error: "already_yours" });
  });

  it("explains every failure", async () => {
    const noSchool = await makeTeacher({ school: null });
    const [code] = await codesFor("luminol");
    expect(await redeemCode(noSchool.id, code)).toMatchObject({ ok: false, error: "no_school" });
    const t = await makeTeacher();
    expect(await redeemCode(t.id, "hello")).toMatchObject({ ok: false, error: "invalid" });
    expect(await redeemCode(t.id, "LMN-0000-0000-0000")).toMatchObject({ ok: false, error: "not_found" });
  });

  it("a reissued code voids the lost one", async () => {
    const t = await makeTeacher();
    const [code] = await codesFor("luminol");
    const d = await db();
    const [row] = await d.select().from(redemptionCodes).where(eq(redemptionCodes.code, code));
    const r = await reissueCode({ teacherId: null }, row.id, "box damaged");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await redeemCode(t.id, code)).toMatchObject({ ok: false, error: "void" });
    expect((await redeemCode(t.id, r.fresh.code)).ok).toBe(true);
    expect((await reissueCode({ teacherId: null }, r.fresh.id, "again")).ok).toBe(false);
  });

  it("rate-limits repeated bad guesses", async () => {
    const t = await makeTeacher();
    for (let i = 0; i < 10; i++) await redeemCode(t.id, `LMN-0000-0000-${String(i).padStart(4, "0")}`);
    const [code] = await codesFor("luminol");
    expect(await redeemCode(t.id, code)).toMatchObject({ ok: false, error: "rate_limited" });
  });
});
