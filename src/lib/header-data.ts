import "server-only";
import { asc } from "drizzle-orm";
import type { HeaderViewer } from "@/components/layout/SiteHeader";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { getCompanyAdmin } from "./auth/admin";
import { getViewer } from "./auth/viewer";

export async function getHeaderData(): Promise<{ viewer: HeaderViewer; kits: { slug: string; name: string }[] }> {
  const [v, d, company] = await Promise.all([getViewer(), db(), getCompanyAdmin()]);
  const rows = await d.select({ slug: kits.slug, name: kits.name }).from(kits).orderBy(asc(kits.sortOrder));
  return {
    viewer: v
      ? { name: v.teacher.name, email: v.teacher.email, isStaff: !!company, isDistrictAdmin: v.isDistrictAdmin }
      : company
        ? { name: company.name, email: company.username, isStaff: true, isDistrictAdmin: false, companyOnly: true }
        : null,
    kits: rows,
  };
}
