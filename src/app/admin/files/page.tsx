import Link from "next/link";
import { TierBadge } from "@/components/content/ContentBits";
import { fileLibrary } from "@/lib/cms";
import { fileLabel, formatBytes } from "@/lib/files";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { deleteFileAction } from "./actions";
import { FileDrop } from "./FileDrop";

export const metadata = { title: "Files" };

// Files studio: the Curiocrate team's one place for PDFs and other handouts (worksheets, teacher guides, slides).
export default async function StudioFiles(props: PageProps<"/admin/files">) {
  const sp = await props.searchParams;
  const kit = typeof sp.kit === "string" ? sp.kit : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { kits, files, lessons } = await fileLibrary();
  const shown = files.filter((f) => (kit === "" ? true : kit === "none" ? !f.kitId : f.kitId === kit) && (!q || `${f.title} ${f.fileName ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Notice sp={sp} />
      <div className={styles.titleRow}>
        <div>
          <h1 className="h2">Files</h1>
          <p className="hint">Kit manuals, PDFs, worksheets, teacher guides and slides. Uploads go straight to cloud storage and are live for teachers right away, following their access setting. Download any file back from the library.</p>
        </div>
        <span className="hint">
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
      </div>

      <FileDrop kits={kits.map((k) => ({ id: k.id, name: k.name }))} lessons={lessons} defaultKit={kit && kit !== "none" ? kit : (kits[0]?.id ?? "")} />

      <section className={styles.section} aria-labelledby="library-h">
        <h2 id="library-h" className="h3">
          Library
        </h2>
        <form className={styles.search} role="search" method="get">
          <div className="field">
            <label className="label" htmlFor="f-kit">
              Kit
            </label>
            <select id="f-kit" name="kit" className="select" defaultValue={kit}>
              <option value="">All kits</option>
              {kits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
              <option value="none">No kit (professional learning)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-q">
              Search by title or file name
            </label>
            <input id="f-q" name="q" className="input" defaultValue={q} placeholder="worksheet, teacher guide…" />
          </div>
          <button type="submit" className="btn btn-glass">
            Filter
          </button>
        </form>

        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Uploaded files</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">File</th>
                <th scope="col">Kit · lesson</th>
                <th scope="col">Access</th>
                <th scope="col">Added</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link className="link" href={`/admin/content/${f.id}`}>
                      {f.title}
                    </Link>
                  </td>
                  <td>
                    {f.fileKey ? (
                      <>
                        <span className="badge badge-plain">{fileLabel(f.fileName)}</span> <span className="hint">{formatBytes(f.fileBytes)}</span>
                        <div className="hint">{f.fileName}</div>
                      </>
                    ) : (
                      <span className={styles.status_void}>No file yet</span>
                    )}
                  </td>
                  <td>
                    {f.kitName ?? "Professional learning"}
                    <div className="hint">{f.type === "manual" ? "Kit manual" : f.parentTitle ? `in “${f.parentTitle}”` : "Teacher resources"}</div>
                  </td>
                  <td>
                    <TierBadge tier={f.requiredTier} />
                  </td>
                  <td className="hint">{f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td>
                    <div className={styles.inline}>
                      {f.fileKey && (
                        <a className="text-link" href={`/api/files/${f.slug}`}>
                          Download
                        </a>
                      )}
                      <Link className="text-link" href={`/admin/content/${f.id}`}>
                        Edit / replace
                      </Link>
                      <Link className="text-link" href={`/lessons/${f.slug}`}>
                        View
                      </Link>
                      <form action={deleteFileAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="title" value={f.title} />
                        <input type="hidden" name="kit" value={kit} />
                        <button className="btn btn-xs btn-danger" aria-label={`Delete ${f.title}`}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {files.length ? "No files match this filter." : "No files yet. Upload the first one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
