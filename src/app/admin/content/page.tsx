import Link from "next/link";
import { TierBadge } from "@/components/content/ContentBits";
import { Icon } from "@/components/ui/Icon";
import { studioContent } from "@/lib/cms";
import { TYPE_LABEL } from "@/lib/content";
import styles from "../admin.module.css";
import { FileDrop } from "../files/FileDrop";
import { Notice } from "../Notice";

export const metadata = { title: "Content" };

export default async function StudioContent(props: PageProps<"/admin/content">) {
  const sp = await props.searchParams;
  const { kits, items } = await studioContent();
  const groups = [...kits.map((k) => ({ id: k.id, name: k.name, kit: k })), { id: null, name: "Professional learning (no kit)", kit: null }];
  return (
    <>
      <Notice sp={sp} />
      <div className={styles.head} style={{ borderBottom: 0, marginBottom: 8, paddingBottom: 0 }}>
        <div>
          <h1 className="h2">Content</h1>
          <p className="hint">Everything here is live for teachers as soon as you save. Access follows each item&apos;s tier.</p>
        </div>
        <div className={styles.inline}>
          <Link href="/admin/kits/new" className="btn btn-sm">
            + New kit
          </Link>
          <Link href="/admin/content/new?type=instructions" className="btn btn-sm btn-outline">
            + Lesson
          </Link>
          <Link href="#js-lessons" className="btn btn-sm btn-outline">
            + JS lessons
          </Link>
          <Link href="/admin/content/new?type=video" className="btn btn-sm btn-outline">
            + Video
          </Link>
          <Link href="/admin/files" className="btn btn-sm btn-outline">
            + PDFs &amp; files
          </Link>
          <Link href="/admin/content/new?type=training" className="btn btn-sm btn-solid">
            + Training
          </Link>
        </div>
      </div>
      <div id="js-lessons">
        <FileDrop mode="package" kits={kits.map((k) => ({ id: k.id, name: k.name }))} lessons={[]} defaultKit={kits[0]?.id ?? ""} />
      </div>
      {groups.map((g) => {
        const rows = items.filter((i) => i.kitId === g.id);
        const byId = new Map(items.map((i) => [i.id, i]));
        return (
          <section key={g.id ?? "none"} className={styles.section} aria-labelledby={`k-${g.id ?? "none"}`}>
            <div className={styles.inline} style={{ justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
              <h2 id={`k-${g.id ?? "none"}`} className="h3">
                {g.name}
              </h2>
              {g.kit && (
                <div className={styles.inline}>
                  <Link className="text-link" href={`/admin/kits/${g.kit.id}`}>
                    Edit kit
                  </Link>
                  <Link className="text-link" href={`/admin/content/new?type=instructions&kit=${g.kit.id}`}>
                    Add lesson →
                  </Link>
                </div>
              )}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Type</th>
                    <th scope="col">Access</th>
                    <th scope="col">Media</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.parentId && <span className="hint">↳ in “{byId.get(c.parentId)?.title}” · </span>}
                        <Link className="link" href={`/admin/content/${c.id}`}>
                          {c.title}
                        </Link>
                      </td>
                      <td>{TYPE_LABEL[c.type]}</td>
                      <td>
                        <TierBadge tier={c.requiredTier} />
                      </td>
                      <td className={c.mediaStatus === "failed" ? styles.status_void : c.mediaStatus === "processing" ? styles.status_active : ""}>
                        {c.type === "video" ? (c.mediaStatus ?? (c.videoAssetId ? "ready" : "no video yet")) : c.type === "pdf" || c.type === "manual" ? (c.fileKey ? "ready" : "no file yet") : c.type === "interactive" ? (c.packageKey ? "ready" : "no package yet") : "—"}
                      </td>
                      <td>
                        <div className={styles.inline}>
                          <Link className="text-link" href={`/admin/content/${c.id}`}>
                            <Icon name="instructions" size={13} /> Edit
                          </Link>
                          <Link className="text-link" href={c.type === "lab" && c.labSlug ? `/labs/${c.labSlug}` : `/lessons/${c.slug}`}>
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Nothing yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
