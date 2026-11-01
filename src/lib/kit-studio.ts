import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, contentItems, kitParts, kits, kitVersions } from "@/db/schema";
import { LESSON_TYPES, slugify } from "./cms";
import type { Actor } from "./entitlements";
import { inTheBoxFrom, isDraftKit, partsTotal, type KitKind, type Part } from "./kit-parts";
import { departmentIds, notify } from "./team/notify";

// Kits in Studio. Product Officers create a kit (online or physical) in Kits; it lands at once, as a draft, in the
// Materials library, where Curriculum fills in its profile (details, NGSS, manuals, lessons, parts) and publishes it.

async function audit(actor: Actor, action: string, kitId: string, details: Record<string, unknown> = {}) {
  const d = await db();
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action, targetType: "kit", targetId: kitId, details });
}

const gradeBand = (min: number, max: number) => (min === max ? `Grade ${min}` : `Grades ${min}–${max}`);
const shortNameOf = (name: string) => name.replace(/\s*kit$/i, "").split(" ").slice(0, 2).join(" ") || name;

export type NewKit = { kind: KitKind; name: string; code: string; tagline: string; gradeMin: number; gradeMax: number };

/** Creates a draft kit. It is in the curriculum team's Materials library immediately, and hidden from teachers. */
export async function createKit(actor: Actor, input: NewKit): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const d = await db();
  const code = input.code.toUpperCase();
  if ((await d.select({ id: kits.id }).from(kits).where(eq(kits.code, code))).length) return { ok: false, error: `The code prefix ${code} is already used by another kit.` };
  const base = slugify(input.name.replace(/\bkit\b/i, ""));
  let slug = base;
  for (let i = 2; (await d.select({ id: kits.id }).from(kits).where(eq(kits.slug, slug))).length; i++) slug = `${base}-${i}`;
  const [k] = await d
    .insert(kits)
    .values({
      slug, code, name: input.name, shortName: shortNameOf(input.name), kind: input.kind, status: "draft",
      tagline: input.tagline, description: "", gradeMin: input.gradeMin, gradeMax: input.gradeMax, gradeBand: gradeBand(input.gradeMin, input.gradeMax),
      accent: input.kind === "online" ? "blue" : "gold", sortOrder: 100,
    })
    .returning();
  await d.insert(kitVersions).values({ kitId: k.id, version: "1.0", notes: "Created in Studio" });
  await audit(actor, "kit.create", k.id, { name: k.name, kind: k.kind });
  // The curriculum department builds the new kit out next (profile, NGSS, lessons, manuals).
  await notify(await departmentIds("curriculum"), { kind: "kit_created", title: `New kit: ${k.name}`, body: `A new ${k.kind} kit (${gradeBand(k.gradeMin, k.gradeMax)}) is ready for curriculum in the Materials library.`, link: `/admin/files/${k.id}` });
  return { ok: true, id: k.id };
}

/** Product Officers: what the kit is (name, one-line description, card style). */
export async function updateKitIdentity(actor: Actor, id: string, input: { name: string; tagline: string; accent: string }) {
  const d = await db();
  await d.update(kits).set({ name: input.name, shortName: shortNameOf(input.name), tagline: input.tagline, accent: input.accent }).where(eq(kits.id, id));
  await audit(actor, "kit.update", id, { name: input.name });
}

/** Curriculum: grades, description, NGSS alignment and skills. */
export async function updateKitProfile(actor: Actor, id: string, input: { gradeMin: number; gradeMax: number; description: string; ngss: string[]; skills: string[] }) {
  const d = await db();
  await d.update(kits).set({ ...input, gradeBand: gradeBand(input.gradeMin, input.gradeMax) }).where(eq(kits.id, id));
  await audit(actor, "kit.update_profile", id);
}

export async function setKitPublished(actor: Actor, id: string, published: boolean) {
  const d = await db();
  await d.update(kits).set({ status: published ? "available" : "draft" }).where(eq(kits.id, id));
  await audit(actor, published ? "kit.publish" : "kit.unpublish", id);
}

/** Replaces a kit's parts list, and keeps the teacher-facing "In the box" list (names only) in step. */
export async function replaceKitParts(actor: Actor, kitId: string, parts: Part[]) {
  const d = await db();
  await d.transaction(async (tx) => {
    await tx.delete(kitParts).where(eq(kitParts.kitId, kitId));
    if (parts.length) await tx.insert(kitParts).values(parts.map((p, i) => ({ ...p, kitId, sortOrder: i + 1 })));
    await tx.update(kits).set({ inTheBox: inTheBoxFrom(parts) }).where(eq(kits.id, kitId));
  });
  await audit(actor, "kit.parts", kitId, { parts: parts.length, ...partsTotal(parts) });
}

export async function getStudioKit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const d = await db();
  const [kit] = await d.select().from(kits).where(eq(kits.id, id));
  return kit ?? null;
}

export async function partsOf(kitId: string) {
  const d = await db();
  return d.select().from(kitParts).where(eq(kitParts.kitId, kitId)).orderBy(asc(kitParts.sortOrder));
}

type Item = typeof contentItems.$inferSelect;
const isFile = (i: Item) => i.type === "pdf" || i.type === "manual";

/** Every kit with what is in it, for the Materials library list and the Kits directory. */
export async function kitOverview() {
  const d = await db();
  const [allKits, items, parts] = await Promise.all([d.select().from(kits).orderBy(asc(kits.sortOrder), asc(kits.createdAt)), d.select().from(contentItems), d.select().from(kitParts)]);
  const summary = (kitId: string | null) => {
    const mine = items.filter((i) => i.kitId === kitId);
    const p = parts.filter((x) => x.kitId === kitId);
    return {
      lessons: mine.filter((i) => !i.parentId && LESSON_TYPES.includes(i.type)).length,
      activities: mine.filter((i) => i.type === "interactive").length,
      files: mine.filter((i) => isFile(i) || (!!i.parentId && !!i.materialKind)).length,
      parts: p.length,
      cost: partsTotal(p),
    };
  };
  return { kits: allKits.map((k) => ({ kit: k, draft: isDraftKit(k), ...summary(k.id) })), general: summary(null) };
}

/**
 * One kit's full profile for the Materials library (kitId null = professional learning, which has no kit):
 * kit-level files (manuals, handouts), lessons with their materials, online activities, other items and parts.
 */
export async function kitProfile(kitId: string | null) {
  const d = await db();
  const items = await d.select().from(contentItems).where(kitId ? eq(contentItems.kitId, kitId) : undefined).orderBy(asc(contentItems.sortOrder));
  const mine = kitId ? items : items.filter((i) => !i.kitId);
  const kids = new Map<string, Item[]>();
  for (const i of mine) if (i.parentId) kids.set(i.parentId, [...(kids.get(i.parentId) ?? []), i]);
  const top = mine.filter((i) => !i.parentId);
  return {
    files: top.filter(isFile).sort((a, b) => Number(b.type === "manual") - Number(a.type === "manual")),
    lessons: top.filter((i) => LESSON_TYPES.includes(i.type)).map((l) => ({ ...l, materials: kids.get(l.id) ?? [] })),
    activities: top.filter((i) => i.type === "interactive"),
    other: top.filter((i) => !isFile(i) && !LESSON_TYPES.includes(i.type)),
    parts: kitId ? await partsOf(kitId) : [],
  };
}
