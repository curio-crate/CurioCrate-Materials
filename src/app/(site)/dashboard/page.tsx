import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { ClassCard } from "@/app/(site)/classes/ClassCard";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireSchool } from "@/lib/auth/viewer";
import { MAX_CLASSES_PER_TEACHER } from "@/lib/class-limits";
import { assignedCounts, classesFor } from "@/lib/classes";
import { contentHref, isShipped, kitContent, listKits, TYPE_LABEL } from "@/lib/content";
import { features } from "@/lib/features";
import { viewerAccess } from "@/lib/viewer-grants";
import { recentViews } from "@/lib/views";
import { CopyCode } from "./CopyCode";
import { MaterialFinder, type FinderItem } from "./MaterialFinder";
import { SchoolMembers } from "./SchoolMembers";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const v = await requireSchool("/dashboard");
  const [kits, access, recent, myClasses, d] = await Promise.all([listKits(), viewerAccess(), recentViews(v.teacher.id), features.classes ? classesFor(v.teacher.id) : [], db()]);
  const [[{ n: colleagues }], counts, kitItems] = await Promise.all([
    d.select({ n: count() }).from(teachers).where(eq(teachers.orgId, v.org.id)),
    assignedCounts(myClasses.map((r) => r.c.id)),
    Promise.all(kits.map(async (k) => ({ kit: k, items: (await kitContent(k.id)).filter(isShipped) }))),
  ]);
  const isOpen = (kitId: string) => access.grants.kitIds.has(kitId) || access.grants.subscription;
  const sortedKits = [...kitItems].sort((a, b) => Number(isOpen(b.kit.id)) - Number(isOpen(a.kit.id)));
  const capOf = new Map(kits.map((k) => [k.id, k.accent]));
  const first = v.teacher.name.split(" ")[0];

  // Everything the finder can search: each kit's top-level materials, with the viewer's lock state.
  const finderItems: FinderItem[] = kitItems.flatMap(({ kit, items }) => {
    const slugById = new Map(items.map((c) => [c.id, c.slug]));
    return items
      .filter((c) => !c.parentId || c.type === "pdf" || c.type === "video")
      .map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        type: c.type,
        typeLabel: TYPE_LABEL[c.type],
        minutes: c.minutes,
        kitName: kit.shortName,
        cap: kit.accent,
        href: contentHref(c, c.parentId ? slugById.get(c.parentId) : undefined),
        locked: access.state(c) !== "open",
        search: [c.title, c.summary, kit.name, TYPE_LABEL[c.type], c.section ?? "", ...c.ngss].join(" ").toLowerCase(),
      }));
  });

  return (
    <div className="container-wide">
      <header className={styles.head}>
        <div>
          <p className="eyebrow rise">{v.org.name}</p>
          <h1 className="h1 rise-2">
            Welcome back, {first}.
          </h1>
        </div>
        <div className={`${styles.headActions} rise-3`}>
          <Link href="/redeem" className="btn">
            <Icon name="key" size={16} /> Redeem a kit code
          </Link>
          {features.classes && myClasses.length < MAX_CLASSES_PER_TEACHER && (
            <Link href="/classes#new" className="btn btn-solid">
              <Icon name="plus" size={16} /> New class
            </Link>
          )}
        </div>
      </header>

      {typeof sp.ok === "string" && (
        <p className="alert alert-success" role="status">
          {sp.ok}
        </p>
      )}
      {v.teacher.membership === "pending" && (
        <p className="alert alert-warning" role="status">
          Your school admin hasn&apos;t approved you yet. Until then you see free content and any kits you redeemed yourself.
        </p>
      )}
      <SchoolMembers v={v} />

      <MaterialFinder items={finderItems}>
        <div className={styles.grid}>
          <div className={styles.main}>
            <section aria-labelledby="kits-title">
              <div className={styles.sectionHead}>
                <h2 id="kits-title" className="h3">
                  Your kits
                </h2>
              </div>
              <ul className={styles.kits}>
                {sortedKits.map(({ kit: k, items }) => {
                  const open = isOpen(k.id);
                  const someFree = !open && items.some((c) => !c.parentId && access.state(c) === "open");
                  const lessons = items.filter((c) => !c.parentId && (c.type === "instructions" || c.type === "interactive")).length;
                  return (
                    <li key={k.id} data-cap={k.accent}>
                      <Link href={`/kits/${k.slug}`} className={`${styles.kit} ${open ? "" : styles.kitLocked}`}>
                        <span className={styles.kitArt} aria-hidden="true">
                          <KitArt kit={k.slug} />
                        </span>
                        <span className={styles.kitBody}>
                          <span className={styles.kitName}>{k.name}</span>
                          <span className={styles.kitFacts}>
                            <span>{k.gradeBand}</span>
                            {!!lessons && (
                              <span>
                                {lessons} lesson{lessons === 1 ? "" : "s"}
                              </span>
                            )}
                          </span>
                          <span className={open ? styles.kitOpen : styles.kitClosed}>
                            <Icon name={open ? "unlock" : "lock"} size={14} /> {open ? (access.grants.kitIds.has(k.id) ? "Unlocked" : "With your subscription") : someFree ? "Free lessons only" : "Locked"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="recent-title" className={styles.block}>
              <div className={styles.sectionHead}>
                <h2 id="recent-title" className="h3">
                  Recently opened
                </h2>
              </div>
              {recent.length ? (
                <ul className={styles.recent}>
                  {recent.map(({ item, at }) => (
                    <li key={item.id} data-cap={item.kitId ? capOf.get(item.kitId) : undefined}>
                      <Link href={contentHref(item)} className={styles.recentLink}>
                        <span className={styles.recentIcon} aria-hidden="true">
                          <Icon name={item.type} size={16} />
                        </span>
                        <span className={styles.recentTitle}>{item.title}</span>
                        <span className={styles.recentMeta}>
                          {TYPE_LABEL[item.type]}
                          <time dateTime={at.toISOString()}>{at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="sx-empty">
                  <strong>Lessons you open show up here.</strong>
                  <span>Open a kit above to start, or search for a lesson by name.</span>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.side} aria-label="Classes and school">
            {features.classes && (
              <section aria-labelledby="classes-title" className={styles.sideBlock}>
                <div className={styles.sectionHead}>
                  <h2 id="classes-title" className="h3">
                    Classes
                  </h2>
                  <span className={styles.count}>
                    {myClasses.length} of {MAX_CLASSES_PER_TEACHER}
                  </span>
                </div>
                {myClasses.length ? (
                  <ul className={styles.classList}>
                    {myClasses.map(({ c, students }) => (
                      <li key={c.id}>
                        <ClassCard compact id={c.id} name={c.name} code={c.classCode} students={students} assigned={counts.get(c.id) ?? 0} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="sx-empty">
                    <strong>No classes yet.</strong>
                    <span>Each class gets a join code. Students type it on any Chromebook, with no account or email.</span>
                    <Link href="/classes#new" className="btn btn-sm btn-solid">
                      <Icon name="plus" size={15} /> Create your first class
                    </Link>
                  </div>
                )}
                {!!myClasses.length && (
                  <Link href="/classes" className={`text-link ${styles.sideLink}`}>
                    Manage classes <Icon name="arrow" size={14} />
                  </Link>
                )}
              </section>
            )}

            <section className={`card ${styles.school}`} aria-labelledby="school-title">
              <h2 id="school-title" className="h4">
                {v.org.name}
              </h2>
              <p className="hint">
                {colleagues} teacher{colleagues === 1 ? "" : "s"}
                {access.grants.subscription ? `, subscription ${access.grants.subscriptionEndsAt ? `until ${access.grants.subscriptionEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "active"}` : ""}
              </p>
              <div className={styles.join}>
                <span className="hint">Colleagues join your school with this code{v.teacher.isOrgAdmin ? ". You approve each one." : "."}</span>
                <CopyCode code={v.org.joinCode} />
              </div>
              <nav className={styles.links} aria-label="More">
                <Link href="/training">
                  <Icon name="training" size={16} /> Teacher training
                </Link>
                <Link href="/account">
                  <Icon name="user" size={16} /> My account and data
                </Link>
                <form action="/api/auth/signout" method="post">
                  <button type="submit">
                    <Icon name="logout" size={16} /> Sign out
                  </button>
                </form>
              </nav>
            </section>
          </aside>
        </div>
      </MaterialFinder>
    </div>
  );
}
