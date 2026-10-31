import Image from "next/image";
import Link from "next/link";
import { features } from "@/lib/features";
import styles from "./SiteFooter.module.css";

// Same structure as curiocrate.org's footer: brand column + three labelled link columns + mono bottom bar.
const COLUMNS: { label: string; links: { href: string; text: string; external?: boolean; feature?: keyof typeof features }[] }[] = [
  {
    label: "Explore",
    links: [
      { href: "/catalog", text: "Kit catalog" },
      { href: "/labs", text: "Online labs", feature: "labs" },
      { href: "/training", text: "Teacher training" },
      { href: "/plans", text: "Plans" },
    ],
  },
  {
    label: "Teachers",
    links: [
      { href: "/redeem", text: "Redeem a kit code" },
      { href: "/dashboard", text: "Dashboard" },
      { href: "/join", text: "Student join page", feature: "classes" },
      { href: "mailto:contact@curiocrate.org", text: "contact@curiocrate.org", external: true },
    ],
  },
  {
    label: "Trust",
    links: [
      { href: "/privacy", text: "Student privacy" },
      { href: "/accessibility", text: "Accessibility" },
      { href: "/schools/it", text: "IT & web filters" },
      { href: "https://curiocrate.org", text: "curiocrate.org", external: true },
      { href: "/company/login", text: "Curiocrate team login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Image src="/brand/cclogosmall.png" alt="CurioCrate" width={40} height={40} className={styles.mark} unoptimized />
            <p className={styles.tagline}>Online labs, lessons and training for every Curiocrate kit.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.label}>
              <h2 className={styles.label}>{col.label}</h2>
              <ul className={styles.list}>
                {col.links.filter((l) => !l.feature || features[l.feature]).map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} className={styles.link}>
                        {l.text}
                      </a>
                    ) : (
                      <Link href={l.href} className={styles.link}>
                        {l.text}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.bottom}>
          <span>© 2026 Curiocrate · 501(c)(3) nonprofit</span>
          <span className={styles.domain}>materials.curiocrate.org</span>
        </div>
      </div>
    </footer>
  );
}
