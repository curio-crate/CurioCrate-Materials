import type { Metadata } from "next";
import Link from "next/link";
import { KitArt } from "@/components/kit/KitArt";
import { PageHead } from "@/components/ui/PageHead";
import { LABS } from "@/lib/labs";
import styles from "@/app/catalog/catalog.module.css";

export const metadata: Metadata = { title: "Online labs", description: "Browser labs for every Curiocrate kit. One free demo per kit line." };

export default function LabsPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Online labs" title="Run the experiment," accent="right in the browser." lead="Each kit line has an online lab that works on any Chromebook, by keyboard alone, and with a screen reader. Every lab here is free to try with a teacher account." />
      <ul className={styles.kitGrid}>
        {LABS.map((l) => (
          <li key={l.slug} className={`${styles.kitCard} ${l.kit === "luminol" ? styles.accent_lum : l.kit === "circuits" ? styles.accent_gold : styles.accent_blue}`}>
            <div className={styles.kitArt}>
              <KitArt kit={l.kit} />
            </div>
            <div className={styles.kitBody}>
              <span className="badge badge-free">Free demo</span>
              <h2 className={`kit-title ${styles.kitName}`}>
                <Link href={`/labs/${l.slug}`} className={styles.kitLink}>
                  {l.title}
                </Link>
              </h2>
              <p className={styles.kitTagline}>{l.intro}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
