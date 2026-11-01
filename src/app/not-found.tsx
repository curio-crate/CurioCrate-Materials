import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { PageHead } from "@/components/ui/PageHead";

export default function NotFound() {
  return (
    <SiteChrome>
    <div className="container">
      <PageHead center eyebrow="404" title="Lost in" accent="the night sky." lead="That page doesn't exist, or it moved." />
      <div className="row" style={{ justifyContent: "center" }}>
        <Link href="/catalog" className="btn btn-glass">
          Browse the catalog
        </Link>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    </div>
    </SiteChrome>
  );
}
