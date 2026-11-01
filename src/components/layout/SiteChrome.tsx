import type { ReactNode } from "react";
import { features } from "@/lib/features";
import { getHeaderData } from "@/lib/header-data";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { Starfield } from "./Starfield";

/** The teacher-facing site's frame: night sky, header, footer. Studio (/admin) has its own frame and never uses this. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const { viewer, kits } = await getHeaderData();
  return (
    <>
      <Starfield />
      <SiteHeader viewer={viewer} kits={kits} features={{ labs: features.labs, classes: features.classes, districts: features.districts }} />
      <main id="main" className="page" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
