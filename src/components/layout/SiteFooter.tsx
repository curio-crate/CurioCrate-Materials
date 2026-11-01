import Image from "next/image";
import Link from "next/link";
import styles from "./SiteFooter.module.css";

const COLUMNS: { label: string; links: { href: string; text: string; external?: boolean }[] }[] = [
  {
    label: "Teachers",
    links: [
      { href: "/signin", text: "Sign in" },
      { href: "/redeem", text: "Redeem a kit code" },
      { href: "/plans", text: "Plans" },
      { href: "/demo", text: "Try the demo" },
    ],
  },
  {
    label: "Students",
    links: [
      { href: "/join", text: "Join a class" },
      { href: "/student/signin", text: "Student sign in" },
    ],
  },
  {
    label: "Trust",
    links: [
      { href: "/privacy", text: "Privacy" },
      { href: "/terms", text: "Terms of Use" },
      { href: "/accessibility", text: "Accessibility" },
      { href: "/schools/it", text: "IT & web filters" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>
            <Image src="/brand/cclogosmall.png" alt="" width={24} height={24} unoptimized />
            CurioCrate Materials
          </span>
          <p className={styles.tagline}>Lessons, labs and training for every CurioCrate kit.</p>
          <a href="mailto:contact@curiocrate.org" className={styles.link}>
            contact@curiocrate.org
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.label}>
            <h2 className={styles.label}>{col.label}</h2>
            <ul className={styles.list}>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={styles.link}>
                    {l.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.bottom}>
        <span>© 2026 Curiocrate · 501(c)(3) nonprofit</span>
        <span className={styles.bottomLinks}>
          <a href="https://curiocrate.org">curiocrate.org</a>
          <Link href="/company/login">Team login</Link>
        </span>
      </div>
    </footer>
  );
}
