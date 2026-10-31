import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { contentItems, kits, kitVersions } from "@/db/schema";
import { features } from "./features";

export type ContentItem = typeof contentItems.$inferSelect;
export type Kit = typeof kits.$inferSelect;

export const listKits = cache(async () => {
  const d = await db();
  return d.select().from(kits).orderBy(asc(kits.sortOrder));
});

export const getKit = cache(async (slug: string) => {
  const d = await db();
  const [kit] = await d.select().from(kits).where(eq(kits.slug, slug));
  if (!kit) return null;
  const [version] = await d.select().from(kitVersions).where(and(eq(kitVersions.kitId, kit.id), eq(kitVersions.isCurrent, true)));
  return { kit, version: version ?? null };
});

export const getKitById = cache(async (kitId: string) => {
  const d = await db();
  const [kit] = await d.select().from(kits).where(eq(kits.id, kitId));
  return kit ? getKit(kit.slug) : null;
});

export const listAllContent = cache(async () => {
  const d = await db();
  return d.select().from(contentItems).orderBy(asc(contentItems.sortOrder));
});

export async function kitContent(kitId: string) {
  const d = await db();
  return d.select().from(contentItems).where(eq(contentItems.kitId, kitId)).orderBy(asc(contentItems.sortOrder));
}

export const getContent = cache(async (slug: string) => {
  const d = await db();
  const [c] = await d.select().from(contentItems).where(eq(contentItems.slug, slug));
  return c ?? null;
});

export async function getContentById(id: string) {
  const d = await db();
  const [c] = await d.select().from(contentItems).where(eq(contentItems.id, id));
  return c ?? null;
}

export async function childrenOf(parentId: string) {
  const d = await db();
  return d.select().from(contentItems).where(eq(contentItems.parentId, parentId)).orderBy(asc(contentItems.sortOrder));
}

export async function generalTraining() {
  const d = await db();
  return d.select().from(contentItems).where(and(isNull(contentItems.kitId), eq(contentItems.type, "training"))).orderBy(asc(contentItems.sortOrder));
}

export async function contentByIds(ids: string[]) {
  if (!ids.length) return [];
  const d = await db();
  return d.select().from(contentItems).where(inArray(contentItems.id, ids));
}

/** Content whose feature has shipped (online labs arrive in Phase 2). */
export function isShipped(c: Pick<ContentItem, "type">) {
  return c.type !== "lab" || features.labs;
}

/** Where a content item is opened in the UI. */
export function contentHref(c: Pick<ContentItem, "slug" | "type" | "labSlug" | "parentId">, parentSlug?: string) {
  if (c.type === "lab" && c.labSlug) return `/labs/${c.labSlug}`;
  if ((c.type === "pdf" || c.type === "video") && parentSlug) return `/lessons/${parentSlug}#${c.slug}`;
  return `/lessons/${c.slug}`;
}

export const TYPE_LABEL: Record<ContentItem["type"], string> = {
  lab: "Online lab",
  instructions: "Lesson",
  video: "Video",
  pdf: "PDF",
  training: "Training",
  interactive: "Interactive lesson",
  manual: "Manual",
};

export const TIER_LABEL: Record<ContentItem["requiredTier"], string> = {
  free: "Free",
  kit_owner: "Kit owner",
  subscription: "Subscription",
};
