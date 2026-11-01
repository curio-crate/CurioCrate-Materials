"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FILE_ACCEPT, fileKind, formatBytes, isPackageName, isVideoName, PACKAGE_ACCEPT, titleFromFileName, VIDEO_ACCEPT } from "@/lib/files";
import { MATERIAL, MATERIAL_KINDS, type MaterialKind } from "@/lib/materials";
import { useConfirm } from "../Confirm";
import { studioUpload } from "../upload-client";
import { addMaterialAction, discardFailedMaterialAction, removeContentAction, renameMaterialAction, saveLessonDetailsAction } from "./lesson-actions";

export type Tier = "free" | "kit_owner" | "subscription";
export type PanelMaterial = { id: string; kind: MaterialKind | null; type: string; title: string; fileName: string | null; status: string | null };
export type PanelLesson = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  kitId: string | null;
  tier: Tier;
  minutes: number | null;
  ngss: string[];
  packageName: string | null;
  materials: PanelMaterial[];
};
export type PanelKit = { id: string; name: string; ngss: string[] };

export const TIER_TEXT: Record<Tier, string> = { free: "Free for all teachers", kit_owner: "Kit owners", subscription: "Subscribers" };

type NewMat = { key: string; kind: MaterialKind; file: File; title: string; media: "video" | "file"; pct: number; state: "queued" | "uploading" | "done" | "error"; error?: string; createdId?: string };

const ACCEPT: Record<"video" | "file" | "any", string> = { video: VIDEO_ACCEPT, file: FILE_ACCEPT, any: `${VIDEO_ACCEPT},${FILE_ACCEPT}` };

export function materialLabel(m: { kind: MaterialKind | null; type: string }) {
  return m.kind ? MATERIAL[m.kind].label : m.type === "video" ? "Video" : "Handout";
}

/**
 * The one place a lesson is made: details, the JavaScript activity, and its supplementary materials (teacher
 * training, demo, manual, teacher manual, other files). Opens as a slide-over panel; works for new and existing lessons.
 */
export function LessonPanel({ lesson, kits, defaultKitId, onClose, onSaved }: { lesson: PanelLesson | null; kits: PanelKit[]; defaultKitId?: string | null; onClose: () => void; onSaved: (message: string) => void }) {
  const uid = useId();
  const confirm = useConfirm();
  const [closing, setClosing] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(lesson?.id ?? null);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [kitId, setKitId] = useState<string>(lesson ? (lesson.kitId ?? "") : (defaultKitId ?? kits[0]?.id ?? ""));
  const [tier, setTier] = useState<Tier>(lesson?.tier ?? "kit_owner");
  const [minutes, setMinutes] = useState(lesson?.minutes ? String(lesson.minutes) : "");
  const [ngss, setNgss] = useState((lesson?.ngss ?? []).join(", "));
  const [pkg, setPkg] = useState<File | null>(null);
  const [pkgPct, setPkgPct] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [existing, setExisting] = useState<(PanelMaterial & { newTitle: string; removed: boolean })[]>((lesson?.materials ?? []).map((m) => ({ ...m, newTitle: m.title, removed: false })));
  const [added, setAdded] = useState<NewMat[]>([]);
  // The page refreshes from the server while the panel is open (e.g. right after publishing, before the last uploads
  // land). Merge in materials we haven't seen yet, without touching edits in progress.
  const [seenMaterials, setSeenMaterials] = useState(lesson?.materials);
  if (lesson && lesson.materials !== seenMaterials) {
    setSeenMaterials(lesson.materials);
    const known = new Set([...existing.map((m) => m.id), ...added.map((m) => m.createdId)]);
    const fresh = lesson.materials.filter((m) => !known.has(m.id));
    if (fresh.length) setExisting((list) => [...list, ...fresh.map((m) => ({ ...m, newTitle: m.title, removed: false }))]);
  }
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const pickKind = useRef<MaterialKind>("file");
  const titleRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const nextKey = useRef(0);

  const isInteractive = !lesson || lesson.type === "interactive";
  const editing = !!lessonId;

  const close = () => {
    if (busy) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    returnFocus.current = document.activeElement;
    titleRef.current?.focus();
    document.body.style.overflow = "hidden";
    // Esc inside the "are you sure" dialog only closes that dialog, not the panel.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && close();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePackage = (f: File | undefined) => {
    if (!f) return;
    if (!isPackageName(f.name)) return setError(`“${f.name}” isn't a lesson activity. Use a .zip with index.html, a single .html file, or a .js file.`);
    setError(null);
    setPkg(f);
    if (!title.trim()) setTitle(titleFromFileName(f.name));
  };

  const openPicker = (kind: MaterialKind) => {
    pickKind.current = kind;
    if (pickRef.current) {
      pickRef.current.accept = ACCEPT[MATERIAL[kind].media];
      pickRef.current.value = "";
      pickRef.current.click();
    }
  };

  const addFiles = (files: FileList | null) => {
    const kind = pickKind.current;
    const allowed = MATERIAL[kind].media;
    const next: NewMat[] = [];
    for (const file of Array.from(files ?? [])) {
      const video = isVideoName(file.name);
      if ((allowed === "video" && !video) || (allowed === "file" && !fileKind(file.name)) || (allowed === "any" && !video && !fileKind(file.name))) {
        setError(`“${file.name}” can't be a ${MATERIAL[kind].label.toLowerCase()}. ${allowed === "video" ? "Use an MP4, MOV or WebM video." : allowed === "file" ? "Use a PDF, Word, PowerPoint, Excel, PNG or JPG file." : "Use a video or a document."}`);
        continue;
      }
      next.push({ key: `m${++nextKey.current}`, kind, file, title: titleFromFileName(file.name) || MATERIAL[kind].label, media: video ? "video" : "file", pct: 0, state: "queued" });
    }
    if (next.length) setError(null);
    setAdded((a) => [...a, ...next]);
  };

  const patch = (key: string, p: Partial<NewMat>) => setAdded((a) => a.map((m) => (m.key === key ? { ...m, ...p } : m)));

  const save = async () => {
    setError(null);
    if (title.trim().length < 3) {
      setError("Give the lesson a title (at least 3 characters).");
      titleRef.current?.focus();
      return;
    }
    if (!editing && isInteractive && !pkg) {
      setError("Add the lesson's JavaScript activity first (step 2).");
      return;
    }
    setBusy(true);
    const details = { title, summary, kitId: kitId || null, requiredTier: tier, minutes: Number(minutes) || null, ngss: ngss.split(/[,\s]+/).filter(Boolean) };
    let failed = 0;
    try {
      let id = lessonId;
      if (pkg) {
        setPhase("Uploading the activity…");
        setPkgPct(0);
        const r = await studioUpload(pkg, "package", id ? { contentId: id } : { create: { kitId: kitId || undefined, tier, title, summary } }, setPkgPct);
        id = r.id ?? id;
        setPkg(null);
        setPkgPct(null);
        if (id) setLessonId(id);
      }
      if (!id) throw new Error("The lesson could not be created.");
      setPhase("Saving details…");
      const s = await saveLessonDetailsAction(id, details);
      if (!s.ok) throw new Error(s.error);

      for (const m of existing) {
        if (m.removed) await removeContentAction(m.id);
        else if (m.newTitle.trim() && m.newTitle !== m.title) await renameMaterialAction(m.id, m.newTitle);
      }
      setExisting((list) => list.filter((m) => !m.removed).map((m) => ({ ...m, title: m.newTitle })));

      for (const m of added) {
        if (m.state === "done") continue;
        setPhase(`Uploading ${m.title}…`);
        patch(m.key, { state: "uploading", pct: 0, error: undefined });
        const created = await addMaterialAction(id, { kind: m.kind, title: m.title, media: m.media });
        if (!created.ok) {
          failed++;
          patch(m.key, { state: "error", error: created.error });
          continue;
        }
        try {
          patch(m.key, { createdId: created.id });
          await studioUpload(m.file, m.media, { contentId: created.id }, (pct) => patch(m.key, { pct }));
          patch(m.key, { state: "done", pct: 100 });
        } catch (e) {
          failed++;
          await discardFailedMaterialAction(created.id);
          patch(m.key, { state: "error", error: (e as Error).message });
        }
      }
      if (failed) {
        setError(`The lesson is saved, but ${failed} file${failed === 1 ? "" : "s"} didn't upload. Fix or remove ${failed === 1 ? "it" : "them"} and save again.`);
      } else {
        onSaved(editing ? `Saved “${title.trim()}”. It's live.` : `Published “${title.trim()}”. Teachers can open it now.`);
        setClosing(true);
        setTimeout(onClose, 200);
      }
    } catch (e) {
      setError((e as Error).message);
      setPkgPct(null);
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  const remove = async () => {
    if (!lessonId) return;
    const n = existing.length;
    if (!(await confirm({ title: `Are you sure you want to delete “${title}”?`, message: `Teachers lose it right away${n ? `, with its ${n} material${n === 1 ? "" : "s"}` : ""}. It moves to Recently deleted, where an admin can restore it for 30 days.` }))) return;
    setBusy(true);
    const r = await removeContentAction(lessonId);
    setBusy(false);
    if (r.ok) {
      onSaved(`Moved “${title}” to Recently deleted. An admin can restore it for 30 days.`);
      setClosing(true);
      setTimeout(onClose, 200);
    }
  };

  const kitNgss = kits.find((k) => k.id === kitId)?.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC")) ?? [];
  const shown = existing.filter((m) => !m.removed);

  return (
    <div className={closing ? "st-closing" : undefined}>
      <div className="st-scrim" onClick={close} aria-hidden="true" />
      <div className="st-drawer" role="dialog" aria-modal="true" aria-labelledby={`${uid}-h`}>
        <div className="st-drawerHead">
          <div>
            <span className="eyebrow">{editing ? "Edit lesson" : "New lesson"}</span>
            <h2 id={`${uid}-h`} className="st-title" style={{ fontSize: "1.75rem", marginTop: 4 }}>
              {title.trim() || "Create a new lesson"}
            </h2>
          </div>
          <button type="button" className="st-close" onClick={close} aria-label="Close panel" disabled={busy}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="st-drawerBody">
          {/* 1. Details */}
          <section className="st-step" aria-labelledby={`${uid}-s1`}>
            <div className="st-stepHead">
              <span className="st-stepNum">1</span>
              <span id={`${uid}-s1`} className="st-stepTitle">
                Lesson details
              </span>
            </div>
            <div className="st-fields">
              <div className="field st-span2">
                <label className="label" htmlFor={`${uid}-title`}>
                  Title
                </label>
                <input ref={titleRef} id={`${uid}-title`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A.3 Find your limit" maxLength={160} />
              </div>
              <div className="field">
                <label className="label" htmlFor={`${uid}-kit`}>
                  Kit
                </label>
                <select id={`${uid}-kit`} className="select" value={kitId} onChange={(e) => setKitId(e.target.value)}>
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                  <option value="">No kit (professional learning)</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor={`${uid}-min`}>
                  Minutes
                </label>
                <input id={`${uid}-min`} className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} placeholder="45" />
              </div>
              <div className="field st-span2">
                <span className="label" id={`${uid}-tier`}>
                  Who can open it
                </span>
                <div className="st-seg" role="group" aria-labelledby={`${uid}-tier`}>
                  {(Object.keys(TIER_TEXT) as Tier[]).map((t) => (
                    <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)}>
                      {TIER_TEXT[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field st-span2">
                <label className="label" htmlFor={`${uid}-ngss`}>
                  NGSS standards
                </label>
                <input id={`${uid}-ngss`} className="input" value={ngss} onChange={(e) => setNgss(e.target.value)} placeholder="MS-PS1-2, SEP-3" />
                {!!kitNgss.length && (
                  <span className="hint">
                    This kit is aligned to {kitNgss.join(", ")}.{" "}
                    <button type="button" className="text-link" onClick={() => setNgss(Array.from(new Set([...ngss.split(/[,\s]+/).filter(Boolean), ...kitNgss])).join(", "))}>
                      Add these
                    </button>
                  </span>
                )}
              </div>
              <div className="field st-span2">
                <label className="label" htmlFor={`${uid}-sum`}>
                  Short description
                </label>
                <textarea id={`${uid}-sum`} className="textarea" style={{ minHeight: 80 }} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences teachers see in the catalog." maxLength={600} />
              </div>
            </div>
          </section>

          {/* 2. Activity */}
          {isInteractive ? (
            <section className="st-step" aria-labelledby={`${uid}-s2`}>
              <div className="st-stepHead">
                <span className="st-stepNum">2</span>
                <span id={`${uid}-s2`} className="st-stepTitle">
                  JavaScript activity
                </span>
                <span className="st-stepHint">A .zip with index.html, one .html file, or a .js file</span>
              </div>
              <label
                className="st-drop"
                data-over={over}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  choosePackage(e.dataTransfer.files?.[0]);
                }}
              >
                <Icon name="upload" size={26} />
                <span className="st-dropTitle">{pkg ? pkg.name : editing && lesson?.packageName ? `Current: ${lesson.packageName}` : "Drop the activity here"}</span>
                <span className="hint">{pkg ? `${formatBytes(pkg.size)} · ready to upload` : editing ? "Drop a new version to replace it, or click to choose." : "or click to choose a file"}</span>
                <input type="file" accept={PACKAGE_ACCEPT} className="sr-only" onChange={(e) => choosePackage(e.target.files?.[0])} disabled={busy} aria-label="Choose the lesson activity" />
                {pkgPct !== null && (
                  <span className="st-progress" style={{ width: "60%" }} aria-hidden="true">
                    <span style={{ width: `${pkgPct}%` }} />
                  </span>
                )}
              </label>
            </section>
          ) : (
            <p className="alert">
              <span>
                This is a {lesson?.type === "training" ? "training course" : "text lesson"}. Edit its text in the <a className="link" href={`/admin/content/${lesson?.id}`}>full editor</a>.
              </span>
            </p>
          )}

          {/* 3. Materials */}
          <section className="st-step" aria-labelledby={`${uid}-s3`}>
            <div className="st-stepHead">
              <span className="st-stepNum">{isInteractive ? 3 : 2}</span>
              <span id={`${uid}-s3`} className="st-stepTitle">
                Supplementary materials
              </span>
              <span className="st-stepHint">Optional</span>
            </div>
            <div className="st-addRow">
              {MATERIAL_KINDS.map((k) => (
                <button key={k} type="button" className="st-add" onClick={() => openPicker(k)} disabled={busy}>
                  <Icon name="plus" size={15} /> {MATERIAL[k].label}
                </button>
              ))}
              <input ref={pickRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => addFiles(e.target.files)} />
            </div>
            <p className="hint">Teacher training and the teacher manual are shown to teachers only, never to students.</p>
            {(!!shown.length || !!added.length) && (
              <ul className="st-mats">
                {shown.map((m) => (
                  <li key={m.id} className="st-mat">
                    <span className="st-matIcon" aria-hidden="true">
                      <Icon name={m.kind ? MATERIAL[m.kind].icon : m.type === "video" ? "video" : "pdf"} size={18} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="st-matKind">
                        {materialLabel(m)}
                        {m.status === "processing" ? " · processing" : m.status === "failed" ? " · failed" : m.status === "uploading" ? " · not uploaded" : ""}
                      </span>
                      <input className="st-matTitle" value={m.newTitle} aria-label={`Title of ${materialLabel(m)}`} onChange={(e) => setExisting((l) => l.map((x) => (x.id === m.id ? { ...x, newTitle: e.target.value } : x)))} />
                      {m.fileName && <span className="st-matFile">{m.fileName}</span>}
                    </span>
                    <button
                      type="button"
                      className="st-close"
                      aria-label={`Remove ${m.title}`}
                      onClick={async () => {
                        if (await confirm({ title: `Are you sure you want to delete “${m.title}”?`, message: "It is removed from the lesson when you save. It then moves to Recently deleted, where an admin can restore it for 30 days." }))
                          setExisting((l) => l.map((x) => (x.id === m.id ? { ...x, removed: true } : x)));
                      }}
                      disabled={busy}
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </li>
                ))}
                {added.map((m) => (
                  <li key={m.key} className="st-mat">
                    <span className="st-matIcon" aria-hidden="true">
                      <Icon name={m.state === "done" ? "check" : m.media === "video" ? "video" : MATERIAL[m.kind].icon} size={18} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="st-matKind">
                        {MATERIAL[m.kind].label} · {m.state === "queued" ? "new" : m.state === "uploading" ? `uploading ${m.pct}%` : m.state === "done" ? "uploaded" : "failed"}
                      </span>
                      <input className="st-matTitle" value={m.title} aria-label={`Title of new ${MATERIAL[m.kind].label}`} onChange={(e) => patch(m.key, { title: e.target.value })} disabled={m.state !== "queued" && m.state !== "error"} />
                      <span className="st-matFile">
                        {m.file.name} · {formatBytes(m.file.size)}
                      </span>
                      {m.state === "uploading" && (
                        <span className="st-progress" aria-hidden="true">
                          <span style={{ width: `${m.pct}%` }} />
                        </span>
                      )}
                      {m.error && (
                        <span className="hint" style={{ color: "var(--st-danger)", display: "block" }}>
                          {m.error}
                        </span>
                      )}
                    </span>
                    {m.state !== "done" && (
                      <button type="button" className="st-close" aria-label={`Remove ${m.title}`} onClick={() => setAdded((a) => a.filter((x) => x.key !== m.key))} disabled={busy}>
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div aria-live="polite">
            {error && (
              <p className="alert alert-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="st-drawerFoot">
          <div className="row" style={{ gap: 8 }}>
            {editing && lesson && (
              <>
                <a className="btn btn-sm" href={`/lessons/${lesson.slug}`} target="_blank" rel="noreferrer">
                  View as teacher
                </a>
                <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={busy}>
                  Delete
                </button>
              </>
            )}
          </div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            {busy && <span className="hint">{phase}</span>}
            <button type="button" className="btn" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-solid" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Publish lesson"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
