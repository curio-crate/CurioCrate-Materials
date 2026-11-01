import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { ClassCard } from "@/app/(site)/classes/ClassCard";
import classStyles from "@/app/(site)/classes/classes.module.css";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireSchool } from "@/lib/auth/viewer";
import { MAX_CLASSES_PER_TEACHER } from "@/lib/class-limits";
import { assignedCounts, classesFor } from "@/lib/classes";
import { contentHref, listKits, TYPE_LABEL } from "@/lib/content";
import { features } from "@/lib/features";
import { viewerAccess } from "@/lib/viewer-grants";
import { recentViews } from "@/lib/views";
import { CopyCode } from "./CopyCode";
import { SchoolMembers } from "./SchoolMembers";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const v = await requireSchool("/dashboard");
  const [kits, access, recent, myClasses, d] = await Promise.all([listKits(), viewerAccess(), recentViews(v.teacher.id), features.classes ? classesFor(v.teacher.id) : [], db()]);
  const [[{ n: colleagues }], counts] = await Promise.all([d.select({ n: count() }).from(teachers).where(eq(teachers.orgId, v.org.id)), assignedCounts(myClasses.map((r) => r.c.id))]);
  const isOpen = (kitId: string) => access.grants.kitIds.has(kitId) || access.grants.subscription;
  const sortedKits = [...kits].sort((a, b) => Number(isOpen(b.id)) - Number(isOpen(a.id)));
  const first = v.teacher.name.split(" ")[0];

  return (
    <div className="container-wide">
      <header className={styles.head}>
        <div>
          <p className="eyebrow rise">{v.org.name}</p>
          <h1 className="h1 rise-2">Welcome back, {first}.</h1>
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

      {features.classes && (
        <section className={styles.section} aria-labelledby="classes-title">
          <div className={styles.sectionHead}>
            <h2 id="classes-title" className="h2">
              Classes <span className={styles.count}>{myClasses.length} / {MAX_CLASSES_PER_TEACHER}</span>
            </h2>
            <Link href="/classes" className="text-link">
              Manage classes →
            </Link>
          </div>
          <ul className={classStyles.classGrid}>
            {myClasses.map(({ c, students }) => (
              <li key={c.id} className="reveal">
                <ClassCard id={c.id} name={c.name} code={c.classCode} students={students} assigned={counts.get(c.id) ?? 0} />
              </li>
            ))}
            {myClasses.length < MAX_CLASSES_PER_TEACHER && (
              <li className="reveal">
                <Link href="/classes#new" className={classStyles.newCard}>
                  <Icon name="plus" size={20} />
                  {myClasses.length ? "Add a class" : "Create your first class"}
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className={styles.section} aria-labelledby="kits-title">
        <div className={styles.sectionHead}>
          <h2 id="kits-title" className="h2">
            Kits
          </h2>
        </div>
        <ul className={styles.kits}>
          {sortedKits.map((k) => {
            const open = isOpen(k.id);
            return (
              <li key={k.id} className="reveal">
                <Link href={`/kits/${k.slug}`} className={`card card-link ${styles.kit} ${open ? "" : styles.kitLocked}`}>
                  <span className={styles.kitArt} aria-hidden="true">
                    <KitArt kit={k.slug} />
                  </span>
                  <span className={styles.kitBody}>
                    <span className={styles.kitName}>{k.name}</span>
                    <span className="hint">{k.gradeBand}</span>
                    <span className={open ? styles.kitOpen : styles.kitClosed}>
                      <Icon name={open ? "unlock" : "lock"} size={14} /> {open ? (access.grants.kitIds.has(k.id) ? "Unlocked" : "With your subscription") : "Locked · redeem a code"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={styles.bottom}>
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="h3">
            Recently opened
          </h2>
          {recent.length ? (
            <ul className={styles.recent}>
              {recent.map(({ item, at }) => (
                <li key={item.id}>
                  <Link href={contentHref(item)} className={styles.recentLink}>
                    <span className={styles.recentIcon} aria-hidden="true">
                      <Icon name={item.type} size={16} />
                    </span>
                    <span className={styles.recentTitle}>{item.title}</span>
                    <span className="hint">
                      {TYPE_LABEL[item.type]} · {at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing yet. Open a kit above to get started.</p>
          )}
        </section>

        <aside className={`card ${styles.school}`} aria-labelledby="school-title">
          <h2 id="school-title" className="h4">
            {v.org.name}
          </h2>
          <p className="hint">
            {colleagues} teacher{colleagues === 1 ? "" : "s"}
            {access.grants.subscription ? ` · Subscription ${access.grants.subscriptionEndsAt ? `until ${access.grants.subscriptionEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "active"}` : ""}
          </p>
          <div className={styles.join}>
            <span className="hint">Colleagues join your school with this code{v.teacher.isOrgAdmin ? " (you approve each one)" : ""}.</span>
            <CopyCode code={v.org.joinCode} />
          </div>
          <nav className={styles.links} aria-label="More">
            <Link href="/training">
              <Icon name="training" size={16} /> Teacher training
            </Link>
            <Link href="/account">
              <Icon name="user" size={16} /> My account &amp; data
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit">
                <Icon name="logout" size={16} /> Sign out
              </button>
            </form>
          </nav>
        </aside>
      </div>
    </div>
  );
}
