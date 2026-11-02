import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentList, ContentRow } from "@/components/content/ContentBits";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { NGSS_LABELS } from "@/content/kits";
import { getCompanyAdmin } from "@/lib/auth/admin";
import { getViewer } from "@/lib/auth/viewer";
import { currentLearner } from "@/lib/students";
import { contentHref, getKit, isShipped, kitContent } from "@/lib/content";
import { viewerAccess } from "@/lib/viewer-grants";
import { KitFilter } from "./KitFilter";
import styles from "./kit.module.css";

export async function generateMetadata(props: PageProps<"/kits/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const k = await getKit(slug);
  return k ? { title: k.kit.name, description: k.kit.tagline } : { title: "Kit not found" };
}

/** "265" → "4 h 25 min" */
function duration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export default async function KitPage(props: PageProps<"/kits/[slug]">) {
  const { slug } = await props.params;
  const found = await getKit(slug);
  if (!found) notFound();
  const { kit } = found;
  // Kit pages are part of the teacher's workspace (reached from the dashboard). Students get their own pages.
  if (!(await getViewer()) && !(await getCompanyAdmin())) redirect((await currentLearner()) ? "/student" : `/signin?next=${encodeURIComponent(`/kits/${slug}`)}`);
  const [allItems, access] = await Promise.all([kitContent(kit.id), viewerAccess()]);
  const items = allItems.filter(isShipped);
  const top = items.filter((c) => !c.parentId);
  const slugById = new Map(items.map((c) => [c.id, c.slug]));
  const groups = [
    { id: "lessons", title: "Lessons", items: top.filter((c) => c.type === "instructions" || c.type === "interactive") },
    { id: "labs", title: "Online lab", items: top.filter((c) => c.type === "lab") },
    { id: "manuals", title: "Manuals", items: top.filter((c) => c.type === "manual") },
    { id: "teacher", title: "Teacher resources", items: top.filter((c) => c.type === "pdf") },
    { id: "training", title: "Training", items: top.filter((c) => c.type === "training") },
  ].filter((g) => g.items.length);

  const owned = access.grants.kitIds.has(kit.id);
  const viaSub = !owned && access.grants.subscription;
  const standards = kit.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC"));
  const practices = kit.ngss.filter((c) => c.startsWith("SEP") || c.startsWith("CCC"));
  const lessons = groups.find((g) => g.id === "lessons")?.items ?? [];
  const classMinutes = lessons.reduce((n, c) => n + (c.minutes ?? 0), 0);
  const someOpen = top.some((c) => access.state(c) === "open");

  return (
    <div className="container" data-cap={kit.accent}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/dashboard">Dashboard</Link>
        <Icon name="chevron" size={14} />
        <span aria-current="page" className={styles.crumbKit}>
          <span className="sx-dot" aria-hidden="true" /> {kit.shortName}
        </span>
      </nav>

      {/* The crate label: the kit's name, specs and what it unlocks, styled like the label on the physical box. */}
      <section className={styles.label} aria-labelledby="kit-title">
        <div className={styles.labelCopy}>
          <p className={styles.kitName}>{kit.name}</p>
          <h1 id="kit-title" className={`kit-title ${styles.title}`}>
            {kit.tagline}
          </h1>
          <p className={styles.desc}>{kit.description}</p>
          <dl className={styles.specs}>
            <div>
              <dt>Grades</dt>
              <dd>{kit.gradeBand.replace(/^Grades\s*/i, "")}</dd>
            </div>
            {!!lessons.length && (
              <div>
                <dt>Lessons</dt>
                <dd>{lessons.length}</dd>
              </div>
            )}
            {!!classMinutes && (
              <div>
                <dt>Class time</dt>
                <dd>{duration(classMinutes)}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className={styles.labelArt}>
          <KitArt kit={kit.slug} />
        </div>
        <div className={`${styles.access} ${owned || viaSub ? styles.accessOpen : ""}`} role="status">
          {owned ? (
            <>
              <Icon name="unlock" size={18} /> <span>Unlocked on your account. Everything below is open.</span>
            </>
          ) : viaSub ? (
            <>
              <Icon name="unlock" size={18} /> <span>Open with your subscription.</span>
            </>
          ) : (
            <>
              <Icon name="lock" size={18} />
              <span>{someOpen ? "The free lessons are open. Redeem the code inside your kit box to unlock the rest on your account." : "Redeem the code inside your kit box to unlock this kit on your account."}</span>
              <Link href="/redeem" className="btn btn-solid btn-sm">
                <Icon name="key" size={15} /> Redeem code
              </Link>
            </>
          )}
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          <KitFilter groups={groups.map((g) => ({ id: g.id, title: g.title, count: g.items.length }))}>
            {groups.map((g) => (
              <section key={g.id} aria-labelledby={`g-${g.id}`} className={styles.group} data-group={g.id}>
                <h2 id={`g-${g.id}`} className={`h3 ${styles.groupTitle}`}>
                  {g.title}
                  {g.id === "lessons" && <span className={styles.groupNote}>Taught in order</span>}
                </h2>
                <ContentList rail={g.id === "lessons"}>
                  {g.items.map((c) => (
                    <ContentRow key={c.id} item={c} step={g.id === "lessons"} href={contentHref(c, c.parentId ? slugById.get(c.parentId) : undefined)} state={access.state(c)} />
                  ))}
                </ContentList>
              </section>
            ))}
          </KitFilter>
          {!groups.length && (
            <div className="sx-empty">
              <strong>Lessons for this kit are on their way.</strong>
              <span>The curriculum team is still building them. They appear here as soon as they&apos;re published.</span>
            </div>
          )}
        </div>

        <aside className={styles.aside} aria-label="About this kit">
          <section className={styles.asideBlock} aria-labelledby="ngss-h">
            <h2 id="ngss-h" className={styles.asideTitle}>
              NGSS alignment
            </h2>
            <dl className={styles.standards}>
              {standards.map((c) => (
                <div key={c}>
                  <dt>{c}</dt>
                  <dd>{NGSS_LABELS[c]}</dd>
                </div>
              ))}
            </dl>
            {!!practices.length && (
              <details className={styles.more}>
                <summary>
                  Practices and crosscutting concepts <span className="sx-chip-count">{practices.length}</span>
                </summary>
                <ul className={styles.practices}>
                  {practices.map((c) => (
                    <li key={c}>
                      <strong>{c}</strong> {NGSS_LABELS[c]}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          {!!kit.skills.length && (
            <section className={styles.asideBlock} aria-labelledby="skills-h">
              <h2 id="skills-h" className={styles.asideTitle}>
                What students learn
              </h2>
              <ul className={styles.chips}>
                {kit.skills.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!kit.inTheBox.length && (
            <section className={styles.asideBlock} aria-labelledby="box-h">
              <h2 id="box-h" className={styles.asideTitle}>
                In the box
              </h2>
              <ul className={styles.box}>
                {kit.inTheBox.map((s) => (
                  <li key={s}>
                    <Icon name="check" size={14} /> {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
