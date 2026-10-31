"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const TABS = [
  { href: "/admin/files", label: "Files & manuals" },
  { href: "/admin/content", label: "Lessons & videos" },
  { href: "/admin/access", label: "Access" },
  { href: "/admin/orders", label: "Orders & codes" },
  { href: "/admin", label: "Code lookup" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/usage", label: "Usage" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/team", label: "Team" },
];

export function AdminNav() {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="Studio sections" className={styles.tabs}>
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`${styles.tab} ${active ? styles.tabOn : ""}`} aria-current={active ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
