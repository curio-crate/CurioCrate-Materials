import type { Metadata } from "next";
import Link from "next/link";
import { ContentRow, NgssTags } from "@/components/content/ContentBits";
import listStyles from "@/components/content/content.module.css";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { contentHref, isShipped, listAllContent, listKits, TYPE_LABEL } from "@/lib/content";
import { features } from "@/lib/features";
import { viewerAccess } from "@/lib/viewer-grants";
import styles from "./catalog.module.css";

export const metadata: Metadata = {
  title: "Kit catalog",
  description: "Every Curiocrate kit's online materials, with free sample lessons, demo labs and NGSS standards tags.",
};

const BANDS = [
  { value: "4-5", label: "Grades 4–5", min: 4, max: 5 },
  { value: "6-8", label: "Grades 6–8", min: 6, max: 8 },
  { value: "9-10", label: "Grades 9–10", min: 9, max: 10 },
];

export default async function CatalogPage(props: PageProps<"/catalog">) {
  const sp = await props.searchParams;
  const grade = typeof sp.grade === "string" ? sp.grade : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const freeOnly = sp.free === "1";

  const [allKits, everything, access] = await Promise.all([listKits(), listAllContent(), viewerAccess()]);
  const all = everything.filter(isShipped);
  const band = BANDS.find((b) => b.value === grade);
  const kits = allKits.filter((k) => !band || (k.gradeMin <= band.max && k.gradeMax >= band.min));
  const kitIds = new Set(kits.map((k) => k.id));
  const kitById = new Map(allKits.map((k) => [k.id, k]));
  const bySlugId = new Map(all.map((c) => [c.id, c.slug]));
  const needle = q.toLowerCase();
  const items = all.filter(
    (c) =>
      !c.parentId &&
      (!c.kitId || kitIds.has(c.kitId)) &&
      (!type || c.type === type) &&
      (!freeOnly || c.requiredTier === "free") &&
      (!needle || c.title.toLowerCase().includes(needle) || c.summary.toLowerCase().includes(needle) || c.ngss.some((n) => n.toLowerCase().includes(needle))),
  );
  const filtering = !!(grade || type || q || freeOnly);
  const counts = (kitId: string) => {
    const mine = all.filter((c) => c.kitId === kitId);
    return { lessons: mine.filter((c) => c.type === "instructions" || c.type === "interactive").length, labs: mine.filter((c) => c.type === "lab").length, videos: mine.filter((c) => c.type === "video").length, free: mine.filter((c) => c.requiredTier === "free").length };
  };

  return (
    <div className="container">
      <PageHead eyebrow="Kit catalog" title="Every kit," accent="online and in your room." lead="Each Curiocrate kit has a full online version: lessons, browser labs, captioned videos and a teacher guide. Free samples from every kit are open to any teacher." />

      <form className={styles.filters} role="search" aria-label="Filter the catalog" method="get">
        <div className="field">
          <label htmlFor="f-grade" className="label">
            Grade band
          </label>
          <select id="f-grade" name="grade" defaultValue={grade} className="select">
            <option value="">All grades (4–10)</option>
            {BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-type" className="label">
            Type
          </label>
          <select id="f-type" name="type" defaultValue={type} className="select">
            <option value="">All types</option>
            {(["instructions", "interactive", ...(features.labs ? (["lab"] as const) : []), "pdf", "manual", "training"] as const).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}s
              </option>
            ))}
          </select>
        </div>
        <div className={`field ${styles.search}`}>
          <label htmlFor="f-q" className="label">
            Search or NGSS code
          </label>
          <input id="f-q" name="q" defaultValue={q} className="input" placeholder="e.g. MS-PS1-2, circuits, filter" />
        </div>
        <label className={`checkbox ${styles.freeToggle}`}>
          <input type="checkbox" name="free" value="1" defaultChecked={freeOnly} /> Free to try
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className="btn btn-glass">
            <Icon name="search" size={15} /> Apply
          </button>
          {filtering && (
            <Link href="/catalog" className="text-link">
              Clear
            </Link>
          )}
        </div>
      </form>

      <section aria-labelledby="kits-title" className={styles.section}>
        <h2 id="kits-title" className="sr-only">
          Kits
        </h2>
        <ul className={styles.kitGrid}>
          {kits.map((k) => {
            const n = counts(k.id);
            const owned = access.grants.kitIds.has(k.id) || access.grants.subscription;
            return (
              <li key={k.id} className={`${styles.kitCard} ${styles[`accent_${k.accent}`]}`}>
                <div className={styles.kitArt}>
                  <KitArt kit={k.slug} />
                </div>
                <div className={styles.kitBody}>
                  <div className="row">
                    <span className="badge badge-plain">{k.gradeBand}</span>
                    {k.status === "in_development" ? <span className="badge badge-sub">In development</span> : <span className="badge badge-kit">Available</span>}
                    {owned && (
                      <span className="badge badge-kit">
                        <span className="sr-only">Status: </span>Unlocked
                      </span>
                    )}
                  </div>
                  <h3 className={`kit-title ${styles.kitName}`}>
                    <Link href={`/kits/${k.slug}`} className={styles.kitLink}>
                      {k.name}
                    </Link>
                  </h3>
                  <p className={styles.kitTagline}>{k.tagline}</p>
                  <p className={styles.kitCounts}>
                    {n.lessons} lessons · {features.labs ? `${n.labs} online lab · ` : ""}
                    {n.videos} videos · {n.free} free to try
                  </p>
                  <NgssTags codes={k.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC"))} />
                </div>
                <span className={styles.kitArrow} aria-hidden="true">
                  <Icon name="arrow" size={20} />
                </span>
              </li>
            );
          })}
          {!kits.length && <li className="muted">No kits match these filters.</li>}
        </ul>
      </section>

      <section aria-labelledby="items-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <span className="eyebrow">{filtering ? "Matching materials" : "Everything online"}</span>
          <h2 id="items-title" className="h2">
            {filtering ? `${items.length} result${items.length === 1 ? "" : "s"}` : "Lessons, labs and guides"}
          </h2>
        </div>
        <ul className={listStyles.list}>
          {items.map((c) => (
            <ContentRow key={c.id} item={c} href={contentHref(c, c.parentId ? bySlugId.get(c.parentId) : undefined)} state={access.state(c)} kitName={c.kitId ? kitById.get(c.kitId)?.shortName : "Professional learning"} />
          ))}
        </ul>
        {!items.length && <p className="muted">Nothing matches. Try clearing a filter.</p>}
      </section>
    </div>
  );
}
