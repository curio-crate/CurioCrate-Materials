import type { Metadata } from "next";
import { PageHead } from "@/components/ui/PageHead";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Accessibility", description: "Curiocrate Materials accessibility statement (WCAG 2.1 AA)." };

export default function AccessibilityPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Accessibility" title="Every student," accent="every device." lead="Curiocrate Materials is built to meet WCAG 2.1 Level AA. Every page is checked automatically for accessibility before each release." />
      <div className={styles.grid}>
        <section className={`card ${styles.block}`} aria-labelledby="what">
          <h2 id="what" className="h3">
            What we support
          </h2>
          <ul className={styles.list}>
            <li>Full keyboard use, with a visible focus ring and a skip link on every page.</li>
            <li>Screen readers: semantic headings, labelled controls and live status messages.</li>
            <li>Color contrast at AA or better, including on our dark theme.</li>
            <li>Captions on every video, on by default, plus a full transcript you can click to jump.</li>
            <li>Reduced motion respected everywhere.</li>
            <li>Online labs that work by keyboard alone and announce results.</li>
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
          <p className="muted">A Voluntary Product Accessibility Template (VPAT 2.5, WCAG edition) built from our automated and keyboard test results is available on request.</p>
        </section>
      </div>
    </div>
  );
}
