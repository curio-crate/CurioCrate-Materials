import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { TYPE_LABEL } from "@/lib/content";
import { fileLabel, formatBytes } from "@/lib/files";
import { asKitKind, isDraftKit, KIT_KIND } from "@/lib/kit-parts";
import { getStudioKit, kitProfile } from "@/lib/kit-studio";
import { asMaterialKind, MATERIAL } from "@/lib/materials";
import { ConfirmSubmit } from "../../Confirm";
import { Notice } from "../../Notice";
import { StudioHead } from "../../StudioHead";
import { deleteFileAction, publishKitAction, saveKitProfileAction } from "../actions";
import { Activities } from "../Activities";
import { FileDrop } from "../FileDrop";
import { PartsEditor } from "../PartsEditor";

export const metadata = { title: "Kit profile" };

type Tab = "details" | "files" | "lessons" | "parts" | "activities";
const TIER_TEXT: Record<string, string> = { free: "Any teacher", kit_owner: "Kit owners", subscription: "Subscribers" };
const n = (count: number, word: string, words = `${word}s`) => `${count} ${count === 1 ? word : words}`;

// A kit's whole profile for the curriculum team, one section at a time: details & NGSS, manuals and files, lessons,
// and the parts list (physical kit) or HTML5 / JavaScript activities (online kit). "general" = professional learning.
export default async function KitProfile(props: PageProps<"/admin/files/[kit]">) {
  await requireAdmin("library");
  const { kit: param } = await props.params;
  const sp = await props.searchParams;
  const kit = param === "general" ? null : await getStudioKit(param);
  if (param !== "general" && !kit) notFound();
  const kitId = kit?.id ?? null;
  const kind = kit ? asKitKind(kit.kind) : null;
  const draft = !!kit && isDraftKit(kit);
  const p = await kitProfile(kitId);

  const tabs: { id: Tab; label: string; count?: number }[] = kit
    ? [
        { id: "details", label: "Details & NGSS" },
        { id: "files", label: "Manuals & files", count: p.files.length },
        { id: "lessons", label: "Lessons", count: p.lessons.length },
        kind === "online" ? { id: "activities", label: "HTML5 / JS activities", count: p.activities.length } : { id: "parts", label: "Parts & components", count: p.parts.length },
      ]
    : [
        { id: "files", label: "Files", count: p.files.length },
        { id: "lessons", label: "Courses", count: p.lessons.length },
      ];
  const tab = tabs.find((t) => t.id === sp.tab)?.id ?? tabs[0].id;
  const href = (t: Tab) => `/admin/files/${param}${t === tabs[0].id ? "" : `?tab=${t}`}`;
  const lessonOptions = p.lessons.map((l) => ({ id: l.id, title: l.title, kitId: l.kitId }));
  const kitOption = kit ? [{ id: kit.id, name: kit.name }] : [];

  return (
    <>
      <Link href="/admin/files" className="st-back">
        <Icon name="chevron" size={14} /> Materials library
      </Link>
      <Notice sp={sp} />
      <StudioHead
        title={kit?.name ?? "Professional learning"}
        sub={kit ? `${KIT_KIND[kind!].label} · ${kit.gradeBand} · code prefix ${kit.code}${kit.tagline ? ` · ${kit.tagline}` : ""}` : "Training and files that aren't tied to a kit."}
      >
        {kit && (
          <>
            <span className={`st-pill ${draft ? "st-pill-warn" : "st-pill-ok"}`}>{draft ? "Draft" : "Published"}</span>
            {!draft && (
              <a className="btn btn-sm" href={`/kits/${kit.slug}`} target="_blank" rel="noreferrer">
                View as teacher
              </a>
            )}
            <form action={publishKitAction}>
              <input type="hidden" name="id" value={kit.id} />
              <input type="hidden" name="tab" value={tab === tabs[0].id ? "" : tab} />
              <input type="hidden" name="publish" value={draft ? "1" : "0"} />
              <SubmitButton className={`btn btn-sm ${draft ? "btn-solid" : ""}`}>{draft ? "Publish kit" : "Unpublish"}</SubmitButton>
            </form>
          </>
        )}
      </StudioHead>
      {draft && (
        <p className="alert alert-warning" style={{ marginBottom: 24 }}>
          Draft: teachers can&apos;t see this kit yet. Fill in its details and materials, then publish it.
        </p>
      )}

      <nav className="st-tabs" aria-label="Kit sections">
        {tabs.map((t) => (
          <Link key={t.id} href={href(t.id)} className="st-tab" aria-current={t.id === tab ? "page" : undefined} scroll={false}>
            {t.label}
            {t.count !== undefined && <span className="st-tabCount">{t.count}</span>}
          </Link>
        ))}
      </nav>

      {tab === "details" && kit && (
        <form action={saveKitProfileAction} className="st-card st-step" style={{ maxWidth: 820 }}>
          <input type="hidden" name="id" value={kit.id} />
          <div className="st-fields">
            <div className="field">
              <label className="label" htmlFor="gradeMin">
                Lowest grade
              </label>
              <input id="gradeMin" name="gradeMin" type="number" min={1} max={12} className="input" defaultValue={kit.gradeMin} />
            </div>
            <div className="field">
              <label className="label" htmlFor="gradeMax">
                Highest grade
              </label>
              <input id="gradeMax" name="gradeMax" type="number" min={1} max={12} className="input" defaultValue={kit.gradeMax} />
            </div>
            <div className="field st-span2">
              <label className="label" htmlFor="description">
                Description teachers read
              </label>
              <textarea id="description" name="description" className="textarea" rows={4} defaultValue={kit.description} placeholder="What students do with this kit, and what they learn." />
            </div>
            <div className="field st-span2">
              <label className="label" htmlFor="ngss">
                NGSS alignment (comma separated)
              </label>
              <input id="ngss" name="ngss" className="input" defaultValue={kit.ngss.join(", ")} placeholder="MS-PS1-2, PS1.B, SEP-3, CCC-1" />
            </div>
            <div className="field st-span2">
              <label className="label" htmlFor="skills">
                What students learn (comma separated)
              </label>
              <input id="skills" name="skills" className="input" defaultValue={kit.skills.join(", ")} />
            </div>
          </div>
          <div>
            <SubmitButton className="btn btn-solid">Save details</SubmitButton>
          </div>
        </form>
      )}

      {tab === "files" && (
        <>
          <ul className="st-mats" aria-label="Manuals and files">
            {p.files.map((f) => (
              <li key={f.id} className="st-mat">
                <span className="st-matIcon" aria-hidden="true">
                  <Icon name={f.type === "manual" ? "manual" : "pdf"} size={18} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="st-matKind">{f.type === "manual" ? "Kit manual" : "Teacher resource"}</span>
                  <Link href={`/admin/content/${f.id}`} className="st-rowTitle" style={{ marginTop: 2 }}>
                    {f.title}
                  </Link>
                  <span className="st-matFile" style={{ display: "block" }}>
                    {f.fileKey ? `${fileLabel(f.fileName)} · ${formatBytes(f.fileBytes)} · ${f.fileName}` : "No file yet"} · {TIER_TEXT[f.requiredTier]}
                  </span>
                </span>
                <span className="st-matActions">
                  {f.fileKey && (
                    <a className="text-link" href={`/api/files/${f.slug}`}>
                      Download
                    </a>
                  )}
                  <Link className="text-link" href={`/admin/content/${f.id}`}>
                    Edit
                  </Link>
                  <form action={deleteFileAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="title" value={f.title} />
                    <input type="hidden" name="kit" value={param} />
                    <input type="hidden" name="tab" value="files" />
                    <ConfirmSubmit className="btn btn-xs btn-danger" aria-label={`Remove ${f.title}`} title={`Are you sure you want to delete “${f.title}”?`} message="Teachers lose it right away. It moves to Recently deleted, where an admin can restore it for 30 days.">
                      Remove
                    </ConfirmSubmit>
                  </form>
                </span>
              </li>
            ))}
            {!p.files.length && <li className="st-empty st-card">No manuals or files yet. Upload the first one below.</li>}
          </ul>
          <p className="hint" style={{ margin: "10px 0 20px" }}>
            Files that belong to one lesson (training, demos, teacher manuals) are on the Lessons tab.
          </p>
          <details className="st-details" open={!p.files.length}>
            <summary>
              <Icon name="plus" size={14} /> Upload manuals or files
            </summary>
            <FileDrop kits={kitOption} lessons={lessonOptions} defaultKit={kitId ?? ""} fixedKit title={kit ? `Upload to ${kit.name}` : "Upload professional learning files"} />
          </details>
        </>
      )}

      {tab === "lessons" && (
        <>
          <div className="st-sectionHead">
            <p className="hint">Lessons open in the lesson panel, where you edit, add materials or delete them.</p>
            <Link className="btn btn-solid btn-sm" href={`/admin/content?new=1${kitId ? `&kit=${kitId}` : ""}`}>
              <Icon name="plus" size={14} /> Create a new lesson
            </Link>
          </div>
          <ul className="st-list" aria-label="Lessons">
            {p.lessons.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/content?edit=${l.id}${kitId ? `&kit=${kitId}` : ""}`} className="st-row">
                  <span className="st-rowIcon" aria-hidden="true">
                    <Icon name={l.type} size={20} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="st-rowTitle">{l.title}</span>
                    <span className="st-rowMeta">
                      {TYPE_LABEL[l.type]}
                      {l.minutes ? ` · ${l.minutes} min` : ""} · {n(l.materials.length, "material")}
                      {l.materials.length ? `: ${l.materials.map((m) => (asMaterialKind(m.materialKind) ? MATERIAL[asMaterialKind(m.materialKind)!].label : m.title)).join(", ")}` : ""}
                    </span>
                  </span>
                  <span />
                  <span className="st-pill st-pill-muted st-rowTier">{TIER_TEXT[l.requiredTier]}</span>
                  <span className="st-rowGo" aria-hidden="true">
                    <Icon name="chevron" size={18} />
                  </span>
                </Link>
              </li>
            ))}
            {!p.lessons.length && <li className="st-empty">No lessons yet.</li>}
          </ul>
          {!!p.other.length && (
            <details className="st-details">
              <summary>
                <Icon name="chevron" size={14} /> Other items ({p.other.length}): online labs and standalone videos
              </summary>
              <ul className="st-mats">
                {p.other.map((o) => (
                  <li key={o.id} className="st-mat">
                    <span className="st-matIcon" aria-hidden="true">
                      <Icon name={o.type} size={18} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="st-matKind">{TYPE_LABEL[o.type]}</span>
                      <span className="st-rowTitle">{o.title}</span>
                    </span>
                    <Link className="text-link" href={`/admin/content/${o.id}`}>
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {tab === "parts" && kit && (
        <>
          <p className="hint" style={{ marginBottom: 14 }}>
            Every component that goes in the box, with quantity and price. Teachers see the names as &ldquo;In the box&rdquo;; prices and suppliers stay in Studio and feed the pricing catalog in Kits.
          </p>
          <PartsEditor kitId={kit.id} initial={p.parts.map((x) => ({ name: x.name, quantity: x.quantity, unitCostCents: x.unitCostCents, supplier: x.supplier }))} />
        </>
      )}

      {tab === "activities" && kit && <Activities kit={kit} activities={p.activities} lessons={lessonOptions} />}
    </>
  );
}
