import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { platformStats } from "@/lib/admin";
import { getCompanyAdmin, usesDevPassword } from "@/lib/auth/admin";
import { can, ROLE_BLURB, ROLE_LABEL, type StudioPerm } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { LESSON_TYPES, studioContent } from "@/lib/cms";
import { serviceModes } from "@/lib/env";
import { Notice } from "./Notice";

export const metadata = { title: "Home" };

const TILES: { perm: StudioPerm; href: string; icon: string; title: string; text: string; count?: "lessons" | "materials" | "kits" | "codes" | "orgs" | "teachers" }[] = [
  { perm: "lessons", href: "/admin/content", icon: "interactive", title: "Lessons", text: "Create lessons from your JavaScript activities and attach training, demos and manuals.", count: "lessons" },
  { perm: "library", href: "/admin/files", icon: "folder", title: "Materials library", text: "Every handout, guide and manual, with download, replace and access.", count: "materials" },
  { perm: "kits", href: "/admin/kits", icon: "box", title: "Kits", text: "Kit names, grades, NGSS alignment and what is in the box.", count: "kits" },
  { perm: "codes", href: "/admin/orders", icon: "key", title: "Kit codes", text: "Generate codes in bulk for an order, print QR sheets, export CSV.", count: "codes" },
  { perm: "schools", href: "/admin/schools", icon: "school", title: "Schools", text: "School licenses, districts, email domains and join codes.", count: "orgs" },
  { perm: "teachers", href: "/admin/access", icon: "users", title: "Teacher access", text: "Look up a teacher, move or revoke their kits, approve school joins.", count: "teachers" },
  { perm: "security", href: "/admin/security", icon: "shield", title: "Security", text: "Code-sharing signals and failed Studio sign-ins." },
  { perm: "team", href: "/admin/team", icon: "user", title: "Team & roles", text: "Add people by email and choose what they can open." },
];

export default async function StudioHome(props: PageProps<"/admin">) {
  const actor = await requireAdmin();
  const sp = await props.searchParams;
  const me = await getCompanyAdmin();
  const role = actor.role;
  const [content, stats, devPassword] = await Promise.all([studioContent(), can(role, "codes") ? platformStats() : null, can(role, "team") ? usesDevPassword(actor.adminId) : false]);
  const counts = {
    lessons: content.items.filter((i) => !i.parentId && LESSON_TYPES.includes(i.type)).length,
    materials: content.items.filter((i) => i.type === "pdf" || i.type === "manual" || !!i.materialKind).length,
    kits: content.kits.length,
    codes: stats?.codes ?? null,
    orgs: stats?.orgs ?? null,
    teachers: stats?.teachers ?? null,
  };
  const notCloud = can(role, "team") ? serviceModes().filter((m) => m.mode !== "live").map((m) => m.service.split(" (")[0]) : [];
  const first = (me?.name ?? "").split(/[\s@]/)[0];

  return (
    <>
      {sp.denied && (
        <p className="alert alert-warning" role="alert" style={{ marginBottom: 20 }}>
          Your role ({ROLE_LABEL[role]}) can&apos;t open that page. Ask an admin if you need it.
        </p>
      )}
      <Notice sp={sp} />
      <section className="st-hero" aria-labelledby="hello">
        <div>
          <h1 id="hello" className="st-title">
            {first ? `Welcome back, ${first}.` : "Welcome back."}
          </h1>
          <p className="st-sub">
            <span className="st-pill" style={{ marginRight: 8 }}>
              {ROLE_LABEL[role]}
            </span>
            {ROLE_BLURB[role]}
          </p>
        </div>
        {can(role, "lessons") && (
          <Link href="/admin/content?new=1" className="btn btn-solid btn-lg">
            <Icon name="plus" size={18} /> Create a new lesson
          </Link>
        )}
      </section>

      {devPassword && (
        <p className="alert alert-warning" role="alert" style={{ marginBottom: 12 }}>
          <span>
            This account still uses the development password from the test code. <Link className="link" href="/admin/account">Change it now</Link>.
          </span>
        </p>
      )}
      {!!notCloud.length && (
        <p className="alert" role="status" style={{ marginBottom: 20 }}>
          <span>
            Running locally: {notCloud.join(", ")}. The live site needs these in the cloud. <Link className="link" href="/admin/team#sys-h">Details</Link>
          </span>
        </p>
      )}

      <ul className="st-grid" style={{ listStyle: "none", padding: 0 }}>
        {TILES.filter((t) => can(role, t.perm)).map((t) => {
          const n = t.count ? counts[t.count] : null;
          return (
            <li key={t.href} style={{ display: "contents" }}>
              <Link href={t.href} className="st-tile">
                <span className="st-tileIcon" aria-hidden="true">
                  <Icon name={t.icon} size={19} />
                </span>
                <span className="st-tileTitle">{t.title}</span>
                <span className="st-tileText">{t.text}</span>
                {n !== null && n !== undefined && <span className="st-tileNum">{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
