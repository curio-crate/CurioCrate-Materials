import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ContentItem, Kit } from "@/lib/content";
import { bodyToText } from "@/lib/cms";
import { LABS } from "@/lib/labs";
import styles from "../admin.module.css";
import { deleteContentAction, saveContentAction } from "./actions";
import { Uploader } from "./Uploader";

const TYPES = [
  ["instructions", "Lesson (instructions)"],
  ["interactive", "Interactive lesson (HTML/JavaScript)"],
  ["manual", "Kit manual"],
  ["video", "Video"],
  ["pdf", "PDF handout / guide"],
  ["training", "Teacher training"],
  ["lab", "Online lab"],
] as const;

export function ContentEditor({ item, kits, parents, defaults, resources: children }: { item: ContentItem | null; kits: Kit[]; parents: { id: string; title: string }[]; defaults: { type: string; kitId: string; parentId: string }; resources: ContentItem[] }) {
  const type = item?.type ?? defaults.type;
  const media = type === "video" || type === "pdf" || type === "manual";
  const upload = type === "video" ? "video" : type === "interactive" ? "package" : media ? "file" : null;
  const standalone = type === "manual" || type === "interactive" || type === "instructions" || type === "training";
  return (
    <div className={styles.grid2}>
      <form action={saveContentAction} className={`card ${styles.panel} ${styles.form}`}>
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <div className={styles.formRow}>
          <div className="field">
            <label className="label" htmlFor="type">Type</label>
            <select id="type" name="type" className="select" defaultValue={type} disabled={!!item}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {item && <input type="hidden" name="type" value={item.type} />}
          </div>
          <div className="field">
            <label className="label" htmlFor="tier">Who can open it</label>
            <select id="tier" name="tier" className="select" defaultValue={item?.requiredTier ?? (type === "training" ? "subscription" : "kit_owner")}>
              <option value="free">Free (any teacher)</option>
              <option value="kit_owner">Kit owners</option>
              <option value="subscription">Subscribers</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" className="input" defaultValue={item?.title} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="summary">Summary (one sentence teachers see in lists)</label>
          <input id="summary" name="summary" className="input" defaultValue={item?.summary} />
        </div>
        <div className={styles.formRow}>
          <div className="field">
            <label className="label" htmlFor="kitId">Kit</label>
            <select id="kitId" name="kitId" className="select" defaultValue={item?.kitId ?? defaults.kitId}>
              <option value="">No kit (professional learning)</option>
              {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          {!standalone ? (
            <div className="field">
              <label className="label" htmlFor="parentId">Show inside lesson</label>
              <select id="parentId" name="parentId" className="select" defaultValue={item?.parentId ?? defaults.parentId}>
                <option value="">— Standalone —</option>
                {parents.filter((p) => p.id !== item?.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          ) : (
            <input type="hidden" name="parentId" value="" />
          )}
        </div>
        <div className={styles.formRow}>
          <div className="field">
            <label className="label" htmlFor="section">Section (e.g. A.3)</label>
            <input id="section" name="section" className="input" defaultValue={item?.section ?? ""} />
          </div>
          <div className="field">
            <label className="label" htmlFor="minutes">Minutes</label>
            <input id="minutes" name="minutes" type="number" min={0} className="input" defaultValue={item?.minutes ?? ""} />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="ngss">NGSS codes (comma separated)</label>
          <input id="ngss" name="ngss" className="input" defaultValue={item?.ngss.join(", ")} placeholder="MS-PS1-2, SEP-3" />
        </div>
        {type === "lab" && (
          <div className="field">
            <label className="label" htmlFor="labSlug">Interactive lab</label>
            <select id="labSlug" name="labSlug" className="select" defaultValue={item?.labSlug ?? ""}>
              {LABS.map((l) => <option key={l.slug} value={l.slug}>{l.title}</option>)}
            </select>
          </div>
        )}
        {!media && (
          <div className="field">
            <label className="label" htmlFor="body">{type === "interactive" ? "Teacher notes (shown under the interactive lesson)" : "Lesson text"}</label>
            <textarea id="body" name="body" className="textarea" rows={16} defaultValue={item ? bodyToText(item.body) : ""} aria-describedby="body-help" />
            <p id="body-help" className="hint">
              <code className="code">## Heading</code> · <code className="code">1. Step</code> · <code className="code">- Bullet</code> · <code className="code">Materials: a, b</code> · <code className="code">&gt; Safety: …</code> <code className="code">&gt; Tip: …</code> <code className="code">&gt; Teacher: …</code> · <code className="code">? Explain prompt</code>. Other lines are paragraphs.
            </p>
          </div>
        )}
        {type === "video" && (
          <div className="field">
            <label className="label" htmlFor="captions">Captions / transcript</label>
            <textarea id="captions" name="captions" className="textarea" rows={8} placeholder={"Paste WebVTT, or one caption per line (timed automatically to the video)."} />
            <p className="hint">{item?.captions?.length ? `${item.captions.length} captions saved. Leave empty to keep them.` : "Every video needs captions before teachers use it."}</p>
          </div>
        )}
        <SubmitButton className="btn btn-solid" pendingText="Saving…">{item ? "Save changes" : "Create"}</SubmitButton>
      </form>

      <div className="stack" style={{ gap: 20 }}>
        {!item && upload && <p className="hint">Create it first, then upload the {upload === "package" ? "lesson package" : upload === "video" ? "video" : "file"} here.</p>}
        {item && upload && (
          <section className={`card ${styles.panel}`} aria-label="Upload">
            <h2 className="h4">{upload === "video" ? "Video file" : upload === "package" ? "Lesson package" : type === "manual" ? "Manual file" : "PDF file"}</h2>
            <Uploader contentId={item.id} kind={upload} current={upload === "video" ? (item.mediaStatus ?? (item.videoAssetId ?? "none")) : (item.fileName ?? "none")} />
            {upload === "package" && <p className="hint">Uploading again replaces the lesson for everyone at once. The lesson runs in a sandbox: it can&apos;t see teachers&apos; accounts or cookies.</p>}
          </section>
        )}
        {item && (item.type === "instructions" || item.type === "training" || item.type === "interactive") && (
          <section className={`card ${styles.panel}`} aria-label="Attached resources">
            <h2 className="h4">Inside this lesson</h2>
            <ul className="stack" style={{ gap: 6 }}>
              {children.map((c) => <li key={c.id}><Link className="link" href={`/admin/content/${c.id}`}>{c.title}</Link> <span className="hint">({c.type})</span></li>)}
              {!children.length && <li className="hint">No videos or PDFs yet.</li>}
            </ul>
            <div className={styles.inline}>
              <Link className="btn btn-xs btn-outline" href={`/admin/content/new?type=video&kit=${item.kitId ?? ""}&parent=${item.id}`}>+ Video</Link>
              <Link className="btn btn-xs btn-outline" href={`/admin/content/new?type=pdf&kit=${item.kitId ?? ""}&parent=${item.id}`}>+ PDF</Link>
            </div>
          </section>
        )}
        {item && (
          <section className={`card ${styles.panel}`} aria-label="Publish">
            <h2 className="h4">Live</h2>
            <Link className="link" href={item.type === "lab" && item.labSlug ? `/labs/${item.labSlug}` : `/lessons/${item.slug}`}>Open as a teacher sees it →</Link>
            <form action={deleteContentAction}>
              <input type="hidden" name="id" value={item.id} />
              <button className="btn btn-xs btn-danger">Delete{children.length ? " (and its resources)" : ""}</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
