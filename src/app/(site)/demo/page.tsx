import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { DemoLab } from "./DemoLab";
import styles from "./demo.module.css";

export const metadata: Metadata = { title: "Demo", description: "Try a CurioCrate online lab: no account needed." };

// The site's one demo. Open to everyone, no sign-in; everything else needs a teacher or student account.
export default function DemoPage() {
  return (
    <div className="container-wide">
      <PageHead eyebrow="Demo · Luminol Forensics kit · Grades 6–8" size="h1" title="Find your limit." lead="Students test six diluted samples in a blackout sleeve to find the faintest stain luminol can detect. This is the same lab your class would use. Try it." />
      <p className={`alert ${styles.note}`} role="note">
        This is a demo, so results aren&apos;t saved. In a class, each student&apos;s results show up on your class page.
      </p>
      <DemoLab />
      <section className={`card ${styles.cta} reveal`} aria-labelledby="demo-next">
        <div>
          <h2 id="demo-next" className="h3">
            Every kit has lessons like this.
          </h2>
          <p className="muted">Sign in to set up your classes, or redeem the code from your kit box.</p>
        </div>
        <div className="row">
          <Link href="/signin" className="btn btn-solid">
            Teacher sign in
          </Link>
          <Link href="/join" className="btn">
            I&apos;m a student
          </Link>
        </div>
      </section>
    </div>
  );
}
