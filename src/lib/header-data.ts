import "server-only";
import { asc } from "drizzle-orm";
import type { HeaderViewer } from "@/components/layout/SiteHeader";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { getViewer } from "./auth/viewer";

export async function getHeaderData(): Promise<{ viewer: HeaderViewer; kits: { slug: string; name: string }[] }> {
  // Studio accounts are deliberately not reflected here: the teacher site and Studio are separate products.
  const [v, d] = await Promise.all([getViewer(), db()]);
  const rows = await d.select({ slug: kits.slug, name: kits.name }).from(kits).orderBy(asc(kits.sortOrder));
  return {
    viewer: v ? { name: v.teacher.name, email: v.teacher.email, isDistrictAdmin: v.isDistrictAdmin } : null,
    kits: rows,
  };
}
