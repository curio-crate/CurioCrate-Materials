"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./SiteHeader.module.css";

export type HeaderViewer = {
  name: string;
  email: string;
  isStaff: boolean;
  isDistrictAdmin: boolean;
  companyOnly?: boolean;
} | null;

type NavLink = { href: string; label: string };
type NavGroup = { label: string; base: string; items: NavLink[] };
type NavEntry = NavLink | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return "items" in e;
}

export function SiteHeader({
  viewer,
  kits,
  features,
}: {
  viewer: HeaderViewer;
  kits: { slug: string; name: string }[];
  features: { labs: boolean; classes: boolean; districts: boolean };
}) {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuId = useId();

  const nav: NavEntry[] = [
    { href: "/catalog", label: "Catalog" },
    {
      label: "Kits",
      base: "/kits",
      items: [...kits.map((k) => ({ href: `/kits/${k.slug}`, label: k.name })), { href: "/catalog", label: "All kits" }],
    },
    ...(features.labs ? [{ href: "/labs", label: "Labs" }] : []),
    { href: "/training", label: "Training" },
    {
      label: "Schools",
      base: "/schools",
      items: [
        { href: "/redeem", label: "Redeem a kit code" },
        { href: "/plans", label: "Plans & subscriptions" },
        ...(features.classes && viewer && !viewer.companyOnly ? [{ href: "/classes", label: "My classes" }] : []),
        ...(features.classes ? [{ href: "/join", label: "Student class join" }] : []),
        ...(features.districts && viewer?.isDistrictAdmin ? [{ href: "/district", label: "District dashboard" }] : []),
        { href: "/schools/it", label: "IT & web filters" },
        { href: "/privacy", label: "Student privacy" },
      ],
    },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const groupActive = (g: NavGroup) => g.items.some((i) => isActive(i.href)) || pathname.startsWith(g.base);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <nav ref={navRef} className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.brand} aria-label="Curiocrate Materials home">
          <Image
            src="/brand/cclogofull5.png"
            alt="CurioCrate"
            width={1026}
            height={332}
            priority
            unoptimized
            className={styles.logo}
          />
          <span className={styles.brandTag} aria-hidden="true">
            Materials
          </span>
        </Link>

        <ul className={styles.links}>
          {nav.map((entry) =>
            isGroup(entry) ? (
              <li
                key={entry.label}
                className={styles.group}
                onMouseEnter={() => setOpen(entry.label)}
                onMouseLeave={() => setOpen((o) => (o === entry.label ? null : o))}
              >
                <button
                  type="button"
                  className={`${styles.link} ${groupActive(entry) ? styles.active : ""}`}
                  aria-expanded={open === entry.label}
                  aria-controls={`${menuId}-${entry.label}`}
                  onClick={() => setOpen((o) => (o === entry.label ? null : entry.label))}
                >
                  {entry.label}
                  <span className={styles.caret} aria-hidden="true">
                    ▾
                  </span>
                </button>
                <div
                  id={`${menuId}-${entry.label}`}
                  className={`${styles.dropdown} ${open === entry.label ? styles.dropdownOpen : ""}`}
                  hidden={open !== entry.label}
                >
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          className={`${styles.dropItem} ${isActive(item.href) ? styles.dropActive : ""}`}
                          aria-current={isActive(item.href) ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ) : (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className={`${styles.link} ${isActive(entry.href) ? styles.active : ""}`}
                  aria-current={isActive(entry.href) ? "page" : undefined}
                >
                  {entry.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        <div className={styles.actions}>
          {viewer ? (
            <>
              {viewer.isStaff && (
                <Link href="/admin/files" className={`${viewer.companyOnly ? styles.outline : styles.link} ${isActive("/admin") ? styles.active : ""}`}>
                  Studio
                </Link>
              )}
              {!viewer.companyOnly && (
                <Link href="/dashboard" className={`${styles.outline} ${isActive("/dashboard") ? styles.outlineActive : ""}`}>
                  <span className={styles.avatar} aria-hidden="true">
                    {viewer.name.trim().charAt(0).toUpperCase() || "T"}
                  </span>
                  Dashboard
                </Link>
              )}
            </>
          ) : (
            <Link href="/signin" className={styles.outline}>
              Teacher sign in
            </Link>
          )}
          <Link href="/redeem" className={styles.solid} data-brand="solid">
            Redeem code
          </Link>
        </div>

        <button
          type="button"
          className={styles.burger}
          aria-expanded={mobileOpen}
          aria-controls={`${menuId}-mobile`}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span className={styles.burgerLines} aria-hidden="true" />
        </button>
      </nav>

      <div id={`${menuId}-mobile`} className={`${styles.mobile} ${mobileOpen ? styles.mobileOpen : ""}`} hidden={!mobileOpen}>
        <ul className={styles.mobileList}>
          {[{ href: "/", label: "Home" }, ...nav.flatMap((e) => (isGroup(e) ? e.items : [e]))]
            .filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i)
            .map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`${styles.mobileLink} ${isActive(l.href) ? styles.mobileActive : ""}`}>
                  {l.label}
                </Link>
              </li>
            ))}
        </ul>
        <div className={styles.mobileActions}>
          <Link href={viewer ? "/dashboard" : "/signin"} className="btn btn-outline btn-block">
            {viewer ? "Dashboard →" : "Teacher sign in →"}
          </Link>
          <Link href="/redeem" className="btn btn-solid btn-block">
            Redeem code →
          </Link>
        </div>
      </div>
    </header>
  );
}
