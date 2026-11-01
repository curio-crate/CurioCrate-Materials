import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LockedPanel, NgssTags } from "@/components/content/ContentBits";
import { InteractiveFrame } from "@/components/content/InteractiveFrame";
import { LessonBlocks, slugify } from "@/components/content/LessonBlocks";
import { Icon } from "@/components/ui/Icon";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { checkAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth/viewer";
import { childrenOf, getContent, getContentById, getKitById, kitContent, TYPE_LABEL, type ContentItem } from "@/lib/content";
import { gateContent } from "@/lib/guard";
import { principalFor } from "@/lib/principal";
import { recordView } from "@/lib/views";
import { classesFor, isAssigned } from "@/lib/classes";
import { features } from "@/lib/features";
import { fileLabel } from "@/lib/files";
import { isTeacherOnly, MATERIAL, asMaterialKind } from "@/lib/materials";
import { packageUrl } from "@/lib/packages";
import { LessonExtras } from "./LessonExtras";
import styles from "./lesson-page.module.css";

export async function generateMetadata(props: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getContent(slug);
  return c ? { title: c.title, description: c.summary } : { title: "Lesson not found" };
}

export default async function LessonPage(props: PageProps<"/lessons/[slug]">) {
  const { slug } = await props.params;
  const item = await getContent(slug);
  if (!item) notFound();
  if (item.parentId) {
    // Attached resources open inside their lesson.
    const parent = await getContentById(item.parentId);
    if (parent) redirect(`/lessons/${parent.slug}#${item.slug}`);
  }
  if (item.type === "lab" && item.labSlug) redirect(`/labs/${item.labSlug}`);

  const [gate, kitInfo, viewer] = await Promise.all([gateContent(slug), item.kitId ? getKitById(item.kitId) : null, getViewer()]);
  const kit = kitInfo?.kit ?? null;
  const siblings = kit ? (await kitContent(kit.id)).filter((c) => !c.parentId && c.type === item.type) : [];
  const idx = siblings.findIndex((c) => c.id === item.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const header = (
    <header className={styles.head}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/catalog">Catalog</Link>
        {kit ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/kits/${kit.slug}`}>{kit.shortName}</Link>
          </>
        ) : (
          <>
            <span aria-hidden="true">/</span>
            <Link href="/training">Training</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{item.section ?? TYPE_LABEL[item.type]}</span>
      </nav>
      <span className="eyebrow">
        {kit ? `${kit.name} · ` : "Professional learning · "}
        {TYPE_LABEL[item.type]}
      </span>
      <h1 className={`h1 ${styles.title}`}>{item.title}</h1>
      <p className="lead">{item.summary}</p>
      <div className={styles.meta}>
        {item.minutes && (
          <span className={styles.metaItem}>
            <Icon name="clock" size={15} /> {item.minutes} minutes
          </span>
        )}
        <NgssTags codes={item.ngss} />
      </div>
    </header>
  );

  if (!gate.ok) {
    if (gate.status === 404) notFound();
    return (
      <div className="container">
        {header}
        <LockedPanel reason={gate.reason as "sign_in" | "needs_kit" | "needs_subscription" | "not_assigned"} kitSlug={kit?.slug} kitName={kit?.name} next={`/lessons/${slug}`} tier={item.requiredTier} />
      </div>
    );
  }

  if (viewer) await recordView(viewer.teacher.id, viewer.org?.id ?? null, item.id);
  const children = await childrenOf(item.id);
  const principal = principalFor(viewer);
  // Materials still uploading (or that failed) never show; teacher-only materials never show to students.
  const visible = children.filter((c) => c.mediaStatus !== "uploading" && c.mediaStatus !== "failed" && (viewer || gate.decision.via === "staff" || !isTeacherOnly(c.materialKind)));
  const childAccess = await Promise.all(visible.map(async (c) => ({ c, ok: viewer ? (await checkAccess(principal, c)).allowed : true })));
  const kindOf = (c: ContentItem) => asMaterialKind(c.materialKind);
  const videos = childAccess.filter((x) => x.c.type === "video" && kindOf(x.c) !== "training_video");
  const training = childAccess.filter((x) => kindOf(x.c) === "training_video");
  const manuals = childAccess.filter((x) => x.c.type !== "video" && (kindOf(x.c) === "manual" || kindOf(x.c) === "teacher_manual"));
  const pdfs = childAccess.filter((x) => x.c.type === "pdf" && !["training_video", "manual", "teacher_manual"].includes(kindOf(x.c) ?? ""));
  const interactiveSrc = item.type === "interactive" ? await packageUrl(item) : null;
  const headings = item.body.filter((b) => b.type === "h").map((b) => (b as { text: string }).text);

  return (
    <div className="container">
      {header}
      <div className={styles.layout}>
        <article className={styles.article} aria-label={item.title}>
          {videos.map(({ c, ok }) => (
            <section key={c.id} id={c.slug} className={styles.resource} aria-labelledby={`${c.slug}-t`}>
              <h2 id={`${c.slug}-t`} className={`h4 ${styles.resTitle}`}>
                <Icon name="video" size={18} /> {kindOf(c) === "demo" ? `Demo: ${c.title}` : c.title}
              </h2>
              {ok ? <VideoPlayer slug={c.slug} title={c.title} cues={c.captions ?? []} /> : <LockedInline item={c} />}
            </section>
          ))}
          {item.type === "interactive" &&
            (interactiveSrc ? <InteractiveFrame src={interactiveSrc} title={item.title} /> : <p className="alert alert-warning">This interactive lesson hasn&apos;t been uploaded yet.</p>)}
          <LessonBlocks blocks={item.body} />
          {(item.type === "pdf" || item.type === "manual") && item.fileKey && <DownloadCard item={item} />}
          {!!training.length && (
            <section className={styles.resource} aria-labelledby="training">
              <h2 id="training" className="h3">
                Teacher training
              </h2>
              <p className="hint">Only teachers see this section.</p>
              {training.map(({ c, ok }) =>
                !ok ? (
                  <LockedInline key={c.id} item={c} />
                ) : c.type === "video" ? (
                  <div key={c.id} id={c.slug} className={styles.resource}>
                    <h3 className={`h4 ${styles.resTitle}`}>
                      <Icon name="training" size={18} /> {c.title}
                    </h3>
                    <VideoPlayer slug={c.slug} title={c.title} cues={c.captions ?? []} />
                  </div>
                ) : (
                  <div key={c.id} className={styles.downloads}>
                    <DownloadCard item={c} />
                  </div>
                ),
              )}
            </section>
          )}
          {!!manuals.length && (
            <section className={styles.resource} aria-labelledby="manuals">
              <h2 id="manuals" className="h3">
                Manuals
              </h2>
              <div className={styles.downloads}>{manuals.map(({ c, ok }) => (ok ? <DownloadCard key={c.id} item={c} tag={MATERIAL[kindOf(c) ?? "manual"].label} /> : <LockedInline key={c.id} item={c} />))}</div>
            </section>
          )}
          {!!pdfs.length && (
            <section className={styles.resource} aria-labelledby="handouts">
              <h2 id="handouts" className="h3">
                Handouts
              </h2>
              <div className={styles.downloads}>{pdfs.map(({ c, ok }) => (ok ? <DownloadCard key={c.id} item={c} /> : <LockedInline key={c.id} item={c} />))}</div>
            </section>
          )}
          <nav className={styles.pager} aria-label={`More ${TYPE_LABEL[item.type].toLowerCase()}s`}>
            {prev ? (
              <Link href={`/lessons/${prev.slug}`} className={styles.pagerLink}>
                <span className="eyebrow">← Previous</span>
                <span>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/lessons/${next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                <span className="eyebrow">Next →</span>
                <span>{next.title}</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className={styles.aside} aria-label="On this page">
          <div className={`card ${styles.asideCard}`}>
            <h2 className="eyebrow">On this page</h2>
            <ul className={styles.toc}>
              {videos.map(({ c }) => (
                <li key={c.id}>
                  <a href={`#${c.slug}`}>
                    <Icon name="video" size={14} /> {c.title}
                  </a>
                </li>
              ))}
              {headings.map((h) => (
                <li key={h}>
                  <a href={`#${slugify(h)}`}>{h}</a>
                </li>
              ))}
              {!!training.length && (
                <li>
                  <a href="#training">
                    <Icon name="training" size={14} /> Teacher training
                  </a>
                </li>
              )}
              {!!manuals.length && (
                <li>
                  <a href="#manuals">
                    <Icon name="manual" size={14} /> Manuals
                  </a>
                </li>
              )}
              {!!pdfs.length && (
                <li>
                  <a href="#handouts">
                    <Icon name="pdf" size={14} /> Handouts
                  </a>
                </li>
              )}
            </ul>
          </div>
          {viewer && (
            <LessonExtras
              slug={item.slug}
              title={item.title}
              lms={features.lms}
              classes={features.classes ? await Promise.all((await classesFor(viewer.teacher.id)).map(async ({ c }) => ({ id: c.id, name: c.name, assigned: await isAssigned(c.id, [item.id]) }))) : undefined}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function DownloadCard({ item, tag }: { item: ContentItem; tag?: string }) {
  return (
    <a href={`/api/files/${item.slug}`} className={styles.download} id={item.slug} data-testid="pdf-download" download>
      <span className={styles.downloadIcon} aria-hidden="true">
        <Icon name="pdf" size={22} />
      </span>
      <span className={styles.downloadBody}>
        <span className={styles.downloadTitle}>{item.title}</span>
        {tag && tag !== item.title && <span className="eyebrow">{tag}</span>}
        <span className="hint">{item.summary}</span>
      </span>
      <span className={styles.downloadAction}>
        <Icon name="download" size={18} /> {fileLabel(item.fileName)}
      </span>
    </a>
  );
}

function LockedInline({ item }: { item: ContentItem }) {
  return (
    <div className={styles.lockedInline} id={item.slug}>
      <Icon name="lock" size={18} />
      <span>
        <strong>{item.title}</strong> is part of the {item.requiredTier === "subscription" ? "subscription" : "full kit"}.
      </span>
      <Link href={item.requiredTier === "subscription" ? "/plans" : "/redeem"} className="text-link">
        {item.requiredTier === "subscription" ? "See plans" : "Redeem code"} →
      </Link>
    </div>
  );
}
