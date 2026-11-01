import { SiteChrome } from "@/components/layout/SiteChrome";

// Every teacher- and student-facing page. Studio lives outside this group, so it never shows the site's navigation.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteChrome>{children}</SiteChrome>;
}
