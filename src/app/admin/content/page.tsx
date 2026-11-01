import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { can } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { studioLessons } from "@/lib/cms";
import { TYPE_LABEL } from "@/lib/content";
import { asMaterialKind } from "@/lib/materials";
import { Notice } from "../Notice";
import { LessonsBoard } from "./LessonsBoard";
import type { PanelLesson } from "./LessonPanel";

export const metadata = { title: "Lessons" };

export default async function StudioLessons(props: PageProps<"/admin/content">) {
  const actor = await requireAdmin("lessons");
  const sp = await props.searchParams;
  const { kits, lessons, other } = await studioLessons();
  const open = sp.new ? "new" : typeof sp.edit === "string" ? sp.edit : null;
  const kitName = new Map(kits.map((k) => [k.id, k.name]));

  const rows: PanelLesson[] = lessons.map((l) => ({
    id: l.id,
    slug: l.slug,
    type: l.type,
    title: l.title,
    summary: l.summary,
    kitId: l.kitId,
    tier: l.requiredTier,
    minutes: l.minutes,
    ngss: l.ngss,
    packageName: l.type === "interactive" ? l.fileName : null,
    materials: l.materials.map((m) => ({ id: m.id, kind: asMaterialKind(m.materialKind), type: m.type, title: m.title, fileName: m.fileName, status: m.mediaStatus })),
  }));

  return (
    <>
      <Notice sp={sp} />
      <LessonsBoard kits={kits.map((k) => ({ id: k.id, name: k.name, ngss: k.ngss }))} lessons={rows} open={open} kit={typeof sp.kit === "string" ? sp.kit : null} />

      <details className="st-details">
        <summary>
          <Icon name="chevron" size={14} /> Other kit items ({other.length}): online labs, standalone guides, manuals and videos
        </summary>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Kit</th>
                <th scope="col">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {other.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td className="hint">{TYPE_LABEL[c.type]}</td>
                  <td className="hint">{c.kitId ? kitName.get(c.kitId) : "Professional learning"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="text-link" href={`/admin/content/${c.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Other ways to add: <Link className="link" href="/admin/content/new?type=instructions">text lesson</Link> · <Link className="link" href="/admin/content/new?type=training">training course</Link> ·{" "}
          <Link className="link" href="/admin/content/new?type=video">standalone video</Link>
          {can(actor.role, "kits") && (
            <>
              {" "}
              · <Link className="link" href="/admin/kits/new">new kit</Link>
            </>
          )}
        </p>
      </details>
    </>
  );
}
