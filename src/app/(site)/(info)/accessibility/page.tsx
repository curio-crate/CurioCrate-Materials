import type { Metadata } from "next";
import { PageHead } from "@/components/ui/PageHead";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Accessibility", description: "Curiocrate Materials accessibility statement (WCAG 2.1 AA)." };

export default function AccessibilityPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Accessibility" title="Every student," accent="every device." lead="We aim for Curiocrate Materials to conform to WCAG 2.1 Level AA. Every page is checked automatically before each release, and we fix barriers as we find them. Automated checks can't catch everything, so some parts may not yet fully conform." />
      <div className={styles.grid}>
        <section className={`card ${styles.block}`} aria-labelledby="what">
          <h2 id="what" className="h3">
            What we support
          </h2>
          <ul className={styles.list}>
            <li>Keyboard use throughout, with a visible focus ring and a skip link on every page.</li>
            <li>Screen readers: semantic headings, labelled controls and live status messages.</li>
            <li>Color contrast checked against AA, including on our dark theme.</li>
            <li>Captions on our lesson videos, on by default, plus a transcript you can click to jump.</li>
            <li>Your reduced-motion setting is respected.</li>
            <li>Online labs designed to work by keyboard and announce results to screen readers.</li>
          </ul>
        </section>
        <section className={`card ${styles.block}`} aria-labelledby="report">
          <h2 id="report" className="h3">
            Tell us about a barrier
          </h2>
          <p className="muted">
            If anything is hard to use, email{" "}
            <a className="link" href="mailto:contact@curiocrate.org">
              contact@curiocrate.org
            </a>{" "}
            with the page and what happened. We aim to reply within two school days.
          </p>
          <p className="muted">A Voluntary Product Accessibility Template (VPAT 2.5, WCAG edition) built from our automated and keyboard test results is available on request. If something isn&apos;t accessible to you, we&apos;ll work with you to provide the material another way.</p>
        </section>
      </div>
    </div>
  );
}
