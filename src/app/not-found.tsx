import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { PageHead } from "@/components/ui/PageHead";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="container">
        <PageHead center eyebrow="404" title="We couldn't find that page." lead="It doesn't exist, or it moved." />
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-solid">
            Home
          </Link>
          <Link href="/dashboard" className="btn">
            Dashboard
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}
