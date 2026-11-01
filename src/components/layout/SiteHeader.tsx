"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import styles from "./SiteHeader.module.css";

export type HeaderViewer =
  | { kind: "teacher"; name: string; isDistrictAdmin: boolean }
  | { kind: "learner"; name: string; inClass: boolean }
  | { kind: "class"; name: string }
  | null;

type NavLink = { href: string; label: string };

/** A short header that scrolls away with the page: a few links for whoever is signed in, nothing more. */
export function SiteHeader({ viewer }: { viewer: HeaderViewer }) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuId = useId();

  const nav: NavLink[] =
    viewer?.kind === "teacher"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/classes", label: "Classes" },
          { href: "/training", label: "Training" },
          ...(viewer.isDistrictAdmin ? [{ href: "/district", label: "District" }] : []),
        ]
      : viewer?.kind === "learner"
        ? [{ href: "/student", label: "My learning" }, ...(viewer.inClass ? [{ href: "/class", label: "My class" }] : [])]
        : viewer?.kind === "class"
          ? [{ href: "/class", label: "My class" }]
          : [
              { href: "/#how", label: "How it works" },
              { href: "/plans", label: "Plans" },
              { href: "/privacy", label: "Privacy" },
            ];

  // Close the mobile menu on navigation (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const home = viewer?.kind === "teacher" ? "/dashboard" : viewer?.kind === "learner" ? "/student" : viewer?.kind === "class" ? "/class" : "/";

  const actions =
    viewer?.kind === "teacher" ? (
      <>
        <Link href="/redeem" className="btn btn-sm btn-ghost">
          Redeem code
        </Link>
        <Link href="/account" className={styles.me}>
          <span className={styles.avatar} aria-hidden="true">
            {viewer.name.trim().charAt(0).toUpperCase() || "T"}
          </span>
          <span className="sr-only">Account: </span>
          <span className={styles.meName}>{viewer.name.split(" ")[0]}</span>
        </Link>
      </>
    ) : viewer ? (
      <>
        <span className={styles.me}>
          <span className={styles.avatar} aria-hidden="true">
            {viewer.name.charAt(0)}
          </span>
          <span className={styles.meName}>{viewer.name}</span>
        </span>
        {viewer.kind === "learner" && (
          <form action="/api/student/signout" method="post">
            <button type="submit" className="btn btn-sm btn-ghost">
              Sign out
            </button>
          </form>
        )}
      </>
    ) : (
      <>
        <Link href="/join" className="btn btn-sm btn-ghost">
          Students
        </Link>
        <Link href="/signin" className="btn btn-sm btn-solid">
          Teacher sign in
        </Link>
      </>
    );

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main">
        <Link href={home} className={styles.brand} aria-label="CurioCrate Materials home">
          <Image src="/brand/cclogosmall.png" alt="" width={30} height={30} priority unoptimized className={styles.mark} />
          <span className={styles.brandName}>CurioCrate</span> <span className={styles.brandTag}>Materials</span>
        </Link>

        <ul className={styles.links}>
          {nav.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={styles.link} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>{actions}</div>

        <button type="button" className={styles.burger} aria-expanded={mobileOpen} aria-controls={`${menuId}-mobile`} onClick={() => setMobileOpen((v) => !v)}>
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span className={styles.burgerLines} aria-hidden="true" />
        </button>
      </nav>

      <div id={`${menuId}-mobile`} className={styles.mobile} hidden={!mobileOpen}>
        <ul className={styles.mobileList}>
          {nav.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={styles.mobileLink} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.mobileActions}>{actions}</div>
      </div>
    </header>
  );
}
