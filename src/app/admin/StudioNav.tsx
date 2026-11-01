"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { can, type StudioPerm, type StudioRole } from "@/lib/auth/roles";

type Item = { href: string; label: string; icon: string; perm?: StudioPerm };

// Grouped by job, and filtered by role: Curriculum sees Lessons only; Product Officers add materials, kits, codes,
// schools and teacher access; Admins see everything.
const GROUPS: { label: string | null; items: Item[] }[] = [
  { label: null, items: [{ href: "/admin", label: "Home", icon: "home" }] },
  {
    label: "Curriculum",
    items: [
      { href: "/admin/content", label: "Lessons", icon: "interactive", perm: "lessons" },
      { href: "/admin/files", label: "Materials library", icon: "folder", perm: "library" },
      { href: "/admin/kits", label: "Kits", icon: "box", perm: "kits" },
    ],
  },
  {
    label: "Schools & keys",
    items: [
      { href: "/admin/orders", label: "Kit codes", icon: "key", perm: "codes" },
      { href: "/admin/lookup", label: "Code lookup", icon: "search", perm: "codes" },
      { href: "/admin/schools", label: "Schools", icon: "school", perm: "schools" },
      { href: "/admin/access", label: "Teacher access", icon: "users", perm: "teachers" },
    ],
  },
  {
    label: "Oversight",
    items: [
      { href: "/admin/security", label: "Security", icon: "shield", perm: "security" },
      { href: "/admin/usage", label: "Usage", icon: "chart", perm: "usage" },
      { href: "/admin/audit", label: "Audit log", icon: "list", perm: "audit" },
      { href: "/admin/team", label: "Team & roles", icon: "user", perm: "team" },
    ],
  },
];

export function StudioNav({ role }: { role: StudioRole }) {
  const path = usePathname() ?? "";
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Studio" className="st-nav">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.perm || can(role, i.perm));
        if (!items.length) return null;
        return (
          <div key={g.label ?? "main"} className="st-navGroup">
            {g.label && <span className="st-navLabel">{g.label}</span>}
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="st-navLink" aria-current={active(i.href) ? "page" : undefined}>
                <Icon name={i.icon} size={18} />
                {i.label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
