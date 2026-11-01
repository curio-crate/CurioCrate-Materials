import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { asKitKind, KIT_KIND } from "@/lib/kit-parts";
import { kitOverview } from "@/lib/kit-studio";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";

export const metadata = { title: "Materials library" };

const n = (count: number, word: string, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

// Materials library: one row per kit. Opening a kit shows its whole profile (details, manuals and files, lessons,
// parts or online activities), where the curriculum team edits, removes and publishes.
export default async function MaterialsLibrary(props: PageProps<"/admin/files">) {
  await requireAdmin("library");
  const sp = await props.searchParams;
  const { kits, general } = await kitOverview();
  const drafts = kits.filter((k) => k.draft).length;

  return (
    <>
      <Notice sp={sp} />
      <StudioHead
        title="Materials library"
        sub={drafts ? `Open a kit to see and edit everything in it. ${n(drafts, "new kit")} from Product ${drafts === 1 ? "is" : "are"} waiting to be built and published.` : "Open a kit to see and edit everything in it: details, manuals, lessons and parts."}
      />
      <ul className="st-list" aria-label="Kits">
        {kits.map(({ kit, draft, lessons, files, parts, activities }, i) => {
          const kind = asKitKind(kit.kind);
          return (
            <li key={kit.id}>
              <Link href={`/admin/files/${kit.id}`} className="st-row" style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }}>
                <span className="st-rowIcon" aria-hidden="true">
                  <Icon name={KIT_KIND[kind].icon} size={20} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="st-rowTitle">{kit.name}</span>
                  <span className="st-rowMeta">
                    {KIT_KIND[kind].label} · {kit.gradeBand} · {n(lessons, "lesson")} · {n(files, "file")} · {kind === "online" ? n(activities, "activity", "activities") : n(parts, "part")}
                  </span>
                </span>
                <span />
                <span className={`st-pill st-rowTier ${draft ? "st-pill-warn" : "st-pill-ok"}`}>{draft ? "Draft" : "Published"}</span>
                <span className="st-rowGo" aria-hidden="true">
                  <Icon name="chevron" size={18} />
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/admin/files/general" className="st-row">
            <span className="st-rowIcon" aria-hidden="true">
              <Icon name="training" size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="st-rowTitle">Professional learning</span>
              <span className="st-rowMeta">
                Not tied to a kit · {n(general.lessons, "course")} · {n(general.files, "file")}
              </span>
            </span>
            <span />
            <span />
            <span className="st-rowGo" aria-hidden="true">
              <Icon name="chevron" size={18} />
            </span>
          </Link>
        </li>
      </ul>
      <p className="hint" style={{ marginTop: 14 }}>
        New kits are created by Product Officers in Kits and show up here right away as drafts.
      </p>
    </>
  );
}
