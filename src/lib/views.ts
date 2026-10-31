import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contentItems, contentViews } from "@/db/schema";

export async function recordView(teacherId: string, orgId: string | null, contentId: string) {
  const d = await db();
  await d
    .insert(contentViews)
    .values({ teacherId, orgId, contentId })
    .onConflictDoUpdate({ target: [contentViews.teacherId, contentViews.contentId], set: { lastViewedAt: new Date(), views: sql`${contentViews.views} + 1`, orgId } });
}

export async function recentViews(teacherId: string, limit = 6) {
  const d = await db();
  return d
    .select({ item: contentItems, at: contentViews.lastViewedAt })
    .from(contentViews)
    .innerJoin(contentItems, eq(contentItems.id, contentViews.contentId))
    .where(eq(contentViews.teacherId, teacherId))
    .orderBy(desc(contentViews.lastViewedAt))
    .limit(limit);
}
