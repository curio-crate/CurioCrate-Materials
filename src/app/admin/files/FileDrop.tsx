"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FILE_ACCEPT, FILE_TYPES_TEXT, fileKind, formatBytes, isPackageName, MAX_FILE_MB, MAX_PACKAGE_MB, PACKAGE_ACCEPT, PACKAGE_TYPES_TEXT, titleFromFileName } from "@/lib/files";
import styles from "../admin.module.css";
import { studioUpload } from "../upload-client";

type Row = { key: string; file: File; title: string; state: "waiting" | "uploading" | "done" | "error"; pct: number; msg?: string; id?: string };

// Studio uploader: pick or drop several files. mode "file": each becomes a live handout or kit manual.
// mode "package": each pre-built HTML/JavaScript lesson becomes a live interactive lesson. Files go straight to storage.
export function FileDrop({ kits, lessons, defaultKit, mode = "file" }: { kits: { id: string; name: string }[]; lessons: { id: string; title: string; kitId: string | null }[]; defaultKit: string; mode?: "file" | "package" }) {
  const router = useRouter();
  const [kitId, setKitId] = useState(defaultKit);
  const [parentId, setParentId] = useState("");
  const [tier, setTier] = useState("kit_owner");
  const [docType, setDocType] = useState<"pdf" | "manual">("pdf");
  const pkg = mode === "package";
  const maxMb = pkg ? MAX_PACKAGE_MB : MAX_FILE_MB;
  const typesText = pkg ? PACKAGE_TYPES_TEXT : FILE_TYPES_TEXT;
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const kitLessons = lessons.filter((l) => (kitId ? l.kitId === kitId : !l.kitId));
  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const fresh: Row[] = [...list].map((file, i) => {
      const ok = pkg ? isPackageName(file.name) : !!fileKind(file.name);
      const bad = !ok ? `Not a supported type. Use ${typesText}.` : file.size > maxMb * 1024 * 1024 ? `Larger than ${maxMb} MB.` : undefined;
      return { key: `${Date.now()}-${i}-${file.name}`, file, title: titleFromFileName(file.name), state: bad ? "error" : "waiting", pct: 0, msg: bad };
    });
    setRows((rs) => [...rs.filter((r) => r.state !== "done"), ...fresh]);
    if (input.current) input.current.value = "";
  };

  const sendOne = async (r: Row) => {
    patch(r.key, { state: "uploading", pct: 0 });
    try {
      const res = await studioUpload(r.file, pkg ? "package" : "file", { create: { kitId, parentId: pkg || docType === "manual" ? "" : parentId, tier, title: r.title, type: docType } }, (pct) => patch(r.key, { pct }));
      patch(r.key, { state: "done", pct: 100, id: res.id });
    } catch (e) {
      patch(r.key, { state: "error", msg: (e as Error).message });
    }
  };

  const uploadAll = async () => {
    setBusy(true);
    for (const r of rows.filter((x) => x.state === "waiting")) await sendOne(r);
    setBusy(false);
    router.refresh();
  };

  const waiting = rows.filter((r) => r.state === "waiting").length;
  const done = rows.filter((r) => r.state === "done").length;

  return (
    <section className={`card ${styles.panel}`} aria-labelledby="upload-h">
      <h2 id="upload-h" className="h4">
        {pkg ? "Upload interactive lessons" : "Upload files"}
      </h2>
      {pkg && <p className="hint">Drop the lessons you built in HTML/JavaScript: {PACKAGE_TYPES_TEXT}. Each one becomes its own lesson, running in a safe sandboxed frame. Add videos and handouts to it afterwards.</p>}
      <div className={styles.formRow3}>
        <div className="field">
          <label className="label" htmlFor="up-kit">
            Kit
          </label>
          <select id="up-kit" className="select" value={kitId} onChange={(e) => {
              setKitId(e.target.value);
              setParentId("");
            }} disabled={busy}>
            <option value="">No kit (professional learning)</option>
            {kits.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
        {!pkg && (
          <div className="field">
            <label className="label" htmlFor="up-type">
              This is a
            </label>
            <select id="up-type" className="select" value={docType} onChange={(e) => setDocType(e.target.value as "pdf" | "manual")} disabled={busy}>
              <option value="pdf">Handout / worksheet / guide</option>
              <option value="manual">Kit manual</option>
            </select>
          </div>
        )}
        {!pkg && docType === "pdf" && (
        <div className="field">
          <label className="label" htmlFor="up-parent">
            Show inside lesson
          </label>
          <select id="up-parent" className="select" value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={busy}>
            <option value="">— Teacher resources (standalone) —</option>
            {kitLessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        )}
        <div className="field">
          <label className="label" htmlFor="up-tier">
            Who can open it
          </label>
          <select id="up-tier" className="select" value={tier} onChange={(e) => setTier(e.target.value)} disabled={busy}>
            <option value="free">Free (any teacher)</option>
            <option value="kit_owner">Kit owners</option>
            <option value="subscription">Subscribers</option>
          </select>
        </div>
      </div>

      <div
        className={`${styles.drop} ${over ? styles.dropOver : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) add(e.dataTransfer.files);
        }}
      >
        <p className={styles.dropTitle}>{pkg ? "Drop lessons here" : "Drop files here"}</p>
        <label className="label" htmlFor={`up-files-${mode}`}>
          Or choose {pkg ? "lessons" : "files"} ({typesText}, up to {maxMb} MB each)
        </label>
        <input ref={input} id={`up-files-${mode}`} type="file" multiple accept={pkg ? PACKAGE_ACCEPT : FILE_ACCEPT} className="input" style={{ paddingTop: 10 }} onChange={(e) => add(e.target.files)} disabled={busy} />
      </div>

      {!!rows.length && (
        <ul className={styles.queue} aria-label="Files to upload">
          {rows.map((r) => (
            <li key={r.key} className={styles.queueRow}>
              <div className={styles.queueMain}>
                {r.state === "waiting" ? (
                  <>
                    <label className="sr-only" htmlFor={`t-${r.key}`}>
                      Title for {r.file.name}
                    </label>
                    <input id={`t-${r.key}`} className="input" value={r.title} onChange={(e) => patch(r.key, { title: e.target.value })} />
                  </>
                ) : (
                  <strong className={styles.queueTitle}>{r.title}</strong>
                )}
                <span className="hint">
                  {r.file.name} · {formatBytes(r.file.size)}
                </span>
              </div>
              <div className={styles.queueState} aria-live="polite">
                {r.state === "waiting" && <span className="hint">Ready</span>}
                {r.state === "uploading" && (
                  <progress max={100} value={r.pct} aria-label={`Uploading ${r.file.name}`}>
                    {r.pct}%
                  </progress>
                )}
                {r.state === "done" && (
                  <span className={styles.status_redeemed}>
                    Live ✓ {r.id && <Link className="text-link" href={`/admin/content/${r.id}`}>Edit</Link>}
                  </span>
                )}
                {r.state === "error" && <span className={styles.status_void}>{r.msg}</span>}
                {(r.state === "waiting" || r.state === "error") && (
                  <button type="button" className="btn btn-xs btn-outline" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} disabled={busy}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.inline}>
        <button type="button" className="btn btn-solid" onClick={uploadAll} disabled={busy || !waiting}>
          {busy ? "Uploading…" : waiting ? `Upload ${waiting} file${waiting === 1 ? "" : "s"}` : "Upload"}
        </button>
        {!busy && done > 0 && !waiting && <span className="hint">{done} uploaded. Teachers can open them now.</span>}
      </div>
    </section>
  );
}
