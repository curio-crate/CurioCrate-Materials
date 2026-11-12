import type { Metadata, Viewport } from "next";
import { THEME } from "@/styles/tokens";
import "./globals.css";

// The curiocrate.org brand families (see design/brand.md), plus the teacher & student site's pair (design/ui-system.md):
// Gabarito for headings and Lexend (designed to make reading easier, including for young readers) for everything else.
const BRAND_FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Barlow+Condensed:wght@500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&family=Gabarito:wght@500..900&family=Lexend:wght@300..700&display=swap";

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
  // The site follows the device's light/dark setting (tokens.css). Studio sets its own color-scheme on .studio.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME.siteBg },
    { media: "(prefers-color-scheme: dark)", color: THEME.siteBgDark },
  ],
  colorScheme: "light dark",
};

// The bare document. The teacher site's frame is in (site)/layout.tsx; Studio's is in admin/layout.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
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
        {children}
      </body>
    </html>
  );
}
