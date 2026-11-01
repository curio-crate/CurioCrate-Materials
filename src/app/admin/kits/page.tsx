import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { asKitKind, costText, KIT_KIND } from "@/lib/kit-parts";
import { kitOverview } from "@/lib/kit-studio";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";

export const metadata = { title: "Kits" };

const n = (count: number, word: string, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

// Kits (Product Officers): the directory of every kit, with what it is and, for physical kits, the cost of one box.
// Curriculum builds each kit's content in the Materials library.
export default async function KitsPage(props: PageProps<"/admin/kits">) {
  await requireAdmin("kits");
  const sp = await props.searchParams;
  const { kits } = await kitOverview();
  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="Kits" sub="Every kit, online and physical. A new kit goes straight to the curriculum team's Materials library as a draft, so they can build it while you finish it here.">
        <Link href="/admin/kits/new" className="btn btn-solid">
          <Icon name="plus" size={16} /> New kit
        </Link>
      </StudioHead>
      <ul className="st-list" aria-label="Kits">
        {kits.map(({ kit, draft, lessons, parts, activities, cost }, i) => {
          const kind = asKitKind(kit.kind);
          return (
            <li key={kit.id}>
              <Link href={`/admin/kits/${kit.id}`} className="st-row" style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}>
                <span className="st-rowIcon" aria-hidden="true">
                  <Icon name={KIT_KIND[kind].icon} size={20} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="st-rowTitle">{kit.name}</span>
                  <span className="st-rowMeta">
                    {KIT_KIND[kind].label} · code {kit.code} · {kit.tagline || kit.gradeBand}
                  </span>
                </span>
                <span className="st-rowMeta st-num st-rowMats">
                  {kind === "online" ? n(activities, "activity", "activities") : parts ? `${n(parts, "part")} · ${costText(cost, parts)}` : "No parts yet"} · {n(lessons, "lesson")}
                </span>
                <span className={`st-pill st-rowTier ${draft ? "st-pill-warn" : "st-pill-ok"}`}>{draft ? "In curriculum" : "Published"}</span>
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
