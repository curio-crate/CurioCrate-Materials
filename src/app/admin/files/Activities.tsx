import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/files";
import { FileDrop } from "./FileDrop";

/** Online kits: the HTML5 / JavaScript activities, shared by the library profile and the Kits page. */
export function Activities({ kit, activities, lessons }: { kit: { id: string; name: string }; activities: { id: string; slug: string; title: string; fileName: string | null; fileBytes: number | null }[]; lessons: { id: string; title: string; kitId: string | null }[] }) {
  return (
    <>
      <ul className="st-mats" aria-label="HTML5 and JavaScript activities" style={{ marginBottom: 20 }}>
        {activities.map((a) => (
          <li key={a.id} className="st-mat">
            <span className="st-matIcon" aria-hidden="true">
              <Icon name="interactive" size={18} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="st-matKind">HTML5 / JavaScript</span>
              <span className="st-rowTitle">{a.title}</span>
              <span className="st-matFile" style={{ display: "block" }}>
                {a.fileName ?? "No package yet"} · {formatBytes(a.fileBytes)}
              </span>
            </span>
            <span className="st-matActions">
              <a className="text-link" href={`/lessons/${a.slug}`} target="_blank" rel="noreferrer">
                Preview
              </a>
              <Link className="text-link" href={`/admin/content?edit=${a.id}&kit=${kit.id}`}>
                Edit
              </Link>
            </span>
          </li>
        ))}
        {!activities.length && <li className="st-empty st-card">No activities yet. Upload the kit&apos;s HTML5 / JavaScript builds below.</li>}
      </ul>
      <FileDrop kits={[{ id: kit.id, name: kit.name }]} lessons={lessons} defaultKit={kit.id} mode="package" fixedKit title={`Upload HTML5 / JavaScript to ${kit.name}`} />
    </>
  );
}
