import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { KITS } from "@/content/kits";
import { CONTENT } from "@/content/lessons";
import { ensureSeeded } from "@/db/seed";
import { contentItems, kits } from "@/db/schema";
import { formatCode, isWellFormedCode, newRedemptionCode, normalizeCode } from "@/lib/codes";
import { freshDb } from "./helpers/db";

describe("database setup", () => {
  it("applies migrations and seeds every kit and content item", async () => {
    const db = await freshDb();
    expect(await db.select().from(kits)).toHaveLength(KITS.length);
    expect(await db.select().from(contentItems)).toHaveLength(CONTENT.length);
  });

  it("seeding twice does not duplicate anything", async () => {
    const db = await freshDb();
    await ensureSeeded(db);
    expect(await db.select().from(contentItems)).toHaveLength(CONTENT.length);
  });

  it("links resources to their lesson and gives every video captions", async () => {
    const db = await freshDb();
    const [lesson] = await db.select().from(contentItems).where(eq(contentItems.slug, "luminol-a1-why-it-glows"));
    const children = await db.select().from(contentItems).where(eq(contentItems.parentId, lesson.id));
    expect(children.map((c) => c.type).sort()).toEqual(["pdf", "video"]);
    const videos = (await db.select().from(contentItems)).filter((c) => c.type === "video");
    expect(videos.length).toBeGreaterThan(0);
    for (const v of videos) expect(v.captions?.length, v.slug).toBeGreaterThan(2);
  });

  it("gives every kit line exactly one free demo lab and at least one free sample lesson", async () => {
    for (const k of KITS) {
      const items = CONTENT.filter((c) => c.kit === k.slug);
      expect(items.filter((c) => c.type === "lab" && c.tier === "free"), k.slug).toHaveLength(1);
      expect(items.some((c) => c.type === "instructions" && c.tier === "free"), k.slug).toBe(true);
    }
  });
});

describe("redemption code format", () => {
  it("generates unique, well-formed codes with the kit prefix", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => newRedemptionCode("LMN")));
    expect(codes.size).toBe(2000);
    for (const c of codes) {
      expect(c.startsWith("LMN")).toBe(true);
      expect(isWellFormedCode(c)).toBe(true);
    }
  });

  it("normalizes what people actually type", () => {
    const code = newRedemptionCode("LMN");
    const typed = formatCode(code).toLowerCase().replace(/-/g, " - ");
    expect(normalizeCode(typed)).toBe(code);
    expect(normalizeCode("lmn-0oil-1234")).toBe("LMN00111234");
    expect(normalizeCode("h2o-oooo")).toBe("H2O0000");
  });
});
