import { eq } from "drizzle-orm";
import { KITS } from "@/content/kits";
import { CONTENT, cuesFor } from "@/content/lessons";
import type { DB } from "./index";
import { contentItems, kits, kitVersions } from "./schema";

/** Idempotent catalog seed: inserts kits, kit versions and content that do not exist yet (matched by slug). */
export async function ensureSeeded(db: DB) {
  const existing = await db.select({ slug: kits.slug, id: kits.id }).from(kits);
  const kitIds = new Map(existing.map((k) => [k.slug, k.id]));
  const versionIds = new Map<string, string>();

  for (const [i, k] of KITS.entries()) {
    if (!kitIds.has(k.slug)) {
      const [row] = await db
        .insert(kits)
        .values({
          slug: k.slug, name: k.name, shortName: k.shortName, code: k.code, gradeBand: k.gradeBand,
          gradeMin: k.gradeMin, gradeMax: k.gradeMax, tagline: k.tagline, description: k.description,
          status: k.status, accent: k.accent, inTheBox: k.inTheBox, skills: k.skills, ngss: k.ngss, sortOrder: i,
        })
        .returning({ id: kits.id });
      kitIds.set(k.slug, row.id);
    }
    const kitId = kitIds.get(k.slug)!;
    const [v] = await db.select().from(kitVersions).where(eq(kitVersions.kitId, kitId));
    if (v) versionIds.set(k.slug, v.id);
    else {
      const [row] = await db.insert(kitVersions).values({ kitId, version: k.version, notes: k.versionNotes }).returning({ id: kitVersions.id });
      versionIds.set(k.slug, row.id);
    }
  }

  const have = new Map((await db.select({ slug: contentItems.slug, id: contentItems.id }).from(contentItems)).map((c) => [c.slug, c.id]));
  // Parents first so children can reference them.
  const ordered = [...CONTENT].sort((a, b) => Number(!!a.parent) - Number(!!b.parent));
  for (const [i, c] of ordered.entries()) {
    if (have.has(c.slug)) continue;
    const cues = c.narration ? cuesFor(c.narration) : null;
    const [row] = await db
      .insert(contentItems)
      .values({
        kitId: c.kit ? kitIds.get(c.kit)! : null,
        kitVersionId: c.kit ? versionIds.get(c.kit)! : null,
        parentId: c.parent ? have.get(c.parent)! : null,
        slug: c.slug, type: c.type, title: c.title, summary: c.summary, requiredTier: c.tier,
        isSample: !!c.sample, minutes: c.minutes ?? null, ngss: c.ngss ?? [], body: c.body ?? [],
        section: c.section ?? null, sortOrder: CONTENT.indexOf(c) ?? i,
        fileKey: c.pdf ? `files/${c.slug}.pdf` : null,
        fileName: c.pdf ? `${c.slug}.pdf` : null,
        videoAssetId: c.narration ? `local:${c.slug}` : null,
        videoDurationSec: cues ? Math.ceil(cues[cues.length - 1].end) : null,
        captions: cues,
        labSlug: c.labSlug ?? null,
      })
      .returning({ id: contentItems.id });
    have.set(c.slug, row.id);
  }
}
