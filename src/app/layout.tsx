import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Starfield } from "@/components/layout/Starfield";
import { features } from "@/lib/features";
import { getHeaderData } from "@/lib/header-data";
import { THEME } from "@/styles/tokens";
import "./globals.css";

// Same Google Fonts stylesheet curiocrate.org imports (see design/brand.md).
const BRAND_FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Barlow+Condensed:wght@500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://materials.curiocrate.org"),
  title: {
    default: "Curiocrate Materials: online labs, lessons and training",
    template: "%s · Curiocrate Materials",
  },
  description:
    "Online labs, instructions, videos and teacher training for every Curiocrate science kit. Grades 4–10.",
  icons: { icon: "/brand/cclogosmall.png", apple: "/brand/cclogosmall.png" },
};

export const viewport: Viewport = {
  themeColor: THEME.void,
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { viewer, kits } = await getHeaderData();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={BRAND_FONTS} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Starfield />
        <SiteHeader viewer={viewer} kits={kits} features={{ labs: features.labs, classes: features.classes, districts: features.districts }} />
        <main id="main" className="page" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
