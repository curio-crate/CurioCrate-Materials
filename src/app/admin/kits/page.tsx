import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { LESSON_TYPES, studioContent } from "@/lib/cms";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";

export const metadata = { title: "Kits" };

export default async function KitsPage(props: PageProps<"/admin/kits">) {
  await requireAdmin("kits");
  const sp = await props.searchParams;
  const { kits, items } = await studioContent();
  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="Kits" sub="Each kit's name, grades, NGSS alignment and box contents. Teachers see these on the catalog and kit pages.">
        <Link href="/admin/kits/new" className="btn btn-solid">
          <Icon name="plus" size={16} /> New kit
        </Link>
      </StudioHead>
      <ul className="st-list">
        {kits.map((k) => {
          const lessons = items.filter((i) => i.kitId === k.id && !i.parentId && LESSON_TYPES.includes(i.type)).length;
          const standards = k.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC"));
          return (
            <li key={k.id}>
              <Link href={`/admin/kits/${k.id}`} className="st-row">
                <span className="st-rowIcon" aria-hidden="true">
                  <Icon name="box" size={20} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="st-rowTitle">{k.name}</span>
                  <span className="st-rowMeta">
                    {k.gradeBand} · code prefix {k.code} · NGSS {standards.join(", ") || "not set"}
                  </span>
                </span>
                <span className="st-pill st-pill-muted st-rowTier">
                  {lessons} lesson{lessons === 1 ? "" : "s"}
                </span>
                <span />
                <span className="st-rowGo" aria-hidden="true">
                  <Icon name="chevron" size={18} />
                </span>
              </Link>
            </li>
          );
        })}
        {!kits.length && <li className="st-empty">No kits yet.</li>}
      </ul>
    </>
  );
}
