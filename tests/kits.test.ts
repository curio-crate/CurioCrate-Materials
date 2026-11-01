import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { kitParts, kits } from "@/db/schema";
import { cleanParts, inTheBoxFrom, parseDollars, partsTotal } from "@/lib/kit-parts";
import { createKit, kitOverview, replaceKitParts, setKitPublished } from "@/lib/kit-studio";
import { freshDb } from "./helpers/db";

const actor = { teacherId: null, email: "CurioCrateAdmin" };

beforeAll(async () => {
  await freshDb();
});

describe("kits: online or physical, drafts, parts & pricing", () => {
  it("existing kits start with their In-the-box list as parts", async () => {
    const d = await db();
    const [lum] = await d.select().from(kits).where(eq(kits.slug, "luminol"));
    const parts = await d.select().from(kitParts).where(eq(kitParts.kitId, lum.id));
    expect(parts.map((p) => p.name)).toEqual(lum.inTheBox);
    expect(lum.kind).toBe("physical");
  });

  it("a new kit is a draft in the library right away; publishing makes it available", async () => {
    const r = await createKit(actor, { kind: "online", name: "Orbit Sim Kit", code: "orb", tagline: "Planets in the browser.", gradeMin: 6, gradeMax: 8 });
    expect(r.ok).toBe(true);
    const id = (r as { id: string }).id;
    const d = await db();
    const [k] = await d.select().from(kits).where(eq(kits.id, id));
    expect([k.status, k.kind, k.code, k.gradeBand]).toEqual(["draft", "online", "ORB", "Grades 6–8"]);
    expect((await kitOverview()).kits.find((x) => x.kit.id === id)?.draft).toBe(true);

    expect(await createKit(actor, { kind: "physical", name: "Other", code: "ORB", tagline: "", gradeMin: 4, gradeMax: 5 })).toMatchObject({ ok: false });

    await setKitPublished(actor, id, true);
    expect((await d.select().from(kits).where(eq(kits.id, id)))[0].status).toBe("available");
  });

  it("parts are saved with prices, totalled per kit, and teachers see names only", async () => {
    const r = await createKit(actor, { kind: "physical", name: "Magnet Lab Kit", code: "MAG", tagline: "", gradeMin: 4, gradeMax: 5 });
    const id = (r as { id: string }).id;
    const parts = cleanParts([
      { name: " Bar magnet ", quantity: 2, unitCostCents: 150, supplier: "Acme #12" },
      { name: "Compass", quantity: "3", unitCostCents: "", supplier: "" },
      { name: "", quantity: 1 },
    ]);
    expect(parts).toEqual([
      { name: "Bar magnet", quantity: 2, unitCostCents: 150, supplier: "Acme #12" },
      { name: "Compass", quantity: 3, unitCostCents: null, supplier: null },
    ]);
    await replaceKitParts(actor, id, parts);
    const d = await db();
    const [k] = await d.select().from(kits).where(eq(kits.id, id));
    expect(k.inTheBox).toEqual(["2 × Bar magnet", "3 × Compass"]);
    const row = (await kitOverview()).kits.find((x) => x.kit.id === id)!;
    expect([row.parts, row.cost.cents, row.cost.unpriced]).toEqual([2, 300, 1]);

    await replaceKitParts(actor, id, []);
    expect(await d.select().from(kitParts).where(eq(kitParts.kitId, id))).toHaveLength(0);
  });

  it("prices parse from what people type", () => {
    expect([parseDollars("$1,234.50"), parseDollars("12"), parseDollars(""), parseDollars("abc"), parseDollars("-3")]).toEqual([123450, 1200, null, null, null]);
    expect(partsTotal([{ quantity: 4, unitCostCents: 25 }, { quantity: 1, unitCostCents: null }])).toEqual({ cents: 100, unpriced: 1 });
    expect(inTheBoxFrom([{ name: "Gloves", quantity: 1 }])).toEqual(["Gloves"]);
  });
});
