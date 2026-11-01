import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentRow, NgssTags } from "@/components/content/ContentBits";
import listStyles from "@/components/content/content.module.css";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { NGSS_LABELS } from "@/content/kits";
import { getCompanyAdmin } from "@/lib/auth/admin";
import { getViewer } from "@/lib/auth/viewer";
import { currentLearner } from "@/lib/students";
import { contentHref, getKit, isShipped, kitContent } from "@/lib/content";
import { viewerAccess } from "@/lib/viewer-grants";
import styles from "./kit.module.css";

export async function generateMetadata(props: PageProps<"/kits/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const k = await getKit(slug);
  return k ? { title: k.kit.name, description: k.kit.tagline } : { title: "Kit not found" };
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
    { id: "manuals", title: "Manuals", items: top.filter((c) => c.type === "manual") },
    { id: "labs", title: "Online lab", items: top.filter((c) => c.type === "lab") },
    { id: "teacher", title: "Teacher resources", items: top.filter((c) => c.type === "pdf") },
    { id: "training", title: "Training", items: top.filter((c) => c.type === "training") },
  ].filter((g) => g.items.length);

  const owned = access.grants.kitIds.has(kit.id);
  const viaSub = !owned && access.grants.subscription;
  const standards = kit.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC"));
  const practices = kit.ngss.filter((c) => c.startsWith("SEP") || c.startsWith("CCC"));

  return (
    <div className="container">
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/dashboard">Dashboard</Link> <span aria-hidden="true">/</span> <span aria-current="page">{kit.shortName}</span>
      </nav>

      <section className={styles.hero} aria-labelledby="kit-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>
            {kit.name} · {kit.gradeBand}
          </p>
          <h1 id="kit-title" className={`kit-title ${styles.title}`}>
            {kit.tagline}
          </h1>
          <p className={styles.desc}>{kit.description}</p>
          <NgssTags codes={standards} />
          <div className={`${styles.accessBanner} ${owned || viaSub ? styles.accessOpen : ""}`} role="status">
            {owned ? (
              <>
                <Icon name="unlock" size={20} /> <span>Unlocked on your account. Everything below is open.</span>
              </>
            ) : viaSub ? (
              <>
                <Icon name="unlock" size={20} /> <span>Open with your subscription.</span>
              </>
            ) : (
              <>
                <Icon name="key" size={20} />
                <span>Unlock the full kit on your account with the code in your kit box.</span>
                <Link href="/redeem" className="btn btn-solid btn-sm">
                  Redeem code
                </Link>
              </>
            )}
          </div>
        </div>
        <div className={styles.heroArt}>
          <KitArt kit={kit.slug} />
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`g-${g.id}`} className={styles.group}>
              <h2 id={`g-${g.id}`} className={`h3 ${styles.groupTitle}`}>
                {g.title}
              </h2>
              <ul className={listStyles.list}>
                {g.items.map((c) => (
                  <ContentRow key={c.id} item={c} href={contentHref(c, c.parentId ? slugById.get(c.parentId) : undefined)} state={access.state(c)} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className={styles.aside} aria-label="About this kit">
          <div className={`card ${styles.asideCard}`}>
            <h2 className="eyebrow">NGSS alignment</h2>
            <dl className={styles.standards}>
              {standards.map((c) => (
                <div key={c}>
                  <dt className="mono">{c}</dt>
                  <dd>{NGSS_LABELS[c]}</dd>
                </div>
              ))}
            </dl>
            {!!practices.length && (
              <>
                <h3 className={`eyebrow ${styles.subLabel}`}>Practices &amp; crosscutting concepts</h3>
                <ul className={styles.practices}>
                  {practices.map((c) => (
                    <li key={c}>
                      <span className="mono">{c}</span> {NGSS_LABELS[c]}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className={`card ${styles.asideCard}`}>
            <h2 className="eyebrow">What students learn</h2>
            <ul className={styles.chips}>
              {kit.skills.map((s) => (
                <li key={s} className="chip">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className={`card ${styles.asideCard}`}>
            <h2 className="eyebrow">In the box</h2>
            <ul className={styles.box}>
              {kit.inTheBox.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
