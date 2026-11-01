import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireSchool } from "@/lib/auth/viewer";
import { contentHref, listKits, TYPE_LABEL } from "@/lib/content";
import { viewerAccess } from "@/lib/viewer-grants";
import { recentViews } from "@/lib/views";
import { DashboardClasses } from "./DashboardClasses";
import { SchoolMembers } from "./SchoolMembers";
import { CopyCode } from "./CopyCode";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const v = await requireSchool("/dashboard");
  const [kits, access, recent, d] = await Promise.all([listKits(), viewerAccess(), recentViews(v.teacher.id), db()]);
  const [{ n: colleagues }] = await d.select({ n: count() }).from(teachers).where(eq(teachers.orgId, v.org.id));
  const owned = kits.filter((k) => access.grants.kitIds.has(k.id));
  const first = v.teacher.name.split(" ")[0];

  return (
    <div className="container">
      <PageHead eyebrow="Dashboard" size="h1" title={`Welcome back, ${first}.`} lead={`${v.org.name}${v.district ? ` · ${v.district.name}` : ""}`} />
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

      <div className={styles.top}>
        <section className={`card ${styles.school}`} aria-labelledby="school-title">
          <span className="eyebrow">Your school</span>
          <h2 id="school-title" className="h3">
            {v.org.name}
          </h2>
          <dl className={styles.stats}>
            <div>
              <dt>Teachers</dt>
              <dd>{colleagues}</dd>
            </div>
            <div>
              <dt>Kits unlocked</dt>
              <dd>{owned.length}</dd>
            </div>
            <div>
              <dt>Subscription</dt>
              <dd className={styles.small}>{access.grants.subscription ? (access.grants.subscriptionEndsAt ? `Until ${access.grants.subscriptionEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Active") : "None"}</dd>
            </div>
          </dl>
          <div className={styles.join}>
            <p className="hint">Colleagues join your school with this code{v.teacher.isOrgAdmin ? "; you approve each one below" : ""}. Kit codes stay personal: each teacher redeems their own.</p>
            <CopyCode code={v.org.joinCode} />
          </div>
        </section>

        <section className={`card ${styles.actions}`} aria-labelledby="quick-title">
          <span className="eyebrow">Quick actions</span>
          <h2 id="quick-title" className="sr-only">
            Quick actions
          </h2>
          <Link href="/redeem" className={styles.action}>
            <Icon name="key" size={20} />
            <span>
              <strong>Redeem a kit code</strong>
              <span className="hint">Unlock a kit on your account</span>
            </span>
          </Link>
          <Link href="/catalog" className={styles.action}>
            <Icon name="grid" size={20} />
            <span>
              <strong>Browse the catalog</strong>
              <span className="hint">Lessons, labs and guides for grades 4–10</span>
            </span>
          </Link>
          <Link href="/training" className={styles.action}>
            <Icon name="training" size={20} />
            <span>
              <strong>Teacher training</strong>
              <span className="hint">Short courses for every kit</span>
            </span>
          </Link>
          <Link href="/account" className={styles.action}>
            <Icon name="users" size={20} />
            <span>
              <strong>My account &amp; data</strong>
              <span className="hint">See, download or delete your data</span>
            </span>
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className={`${styles.action} ${styles.signout}`}>
              <Icon name="back" size={20} />
              <span>
                <strong>Sign out</strong>
                <span className="hint">{v.teacher.email}</span>
              </span>
            </button>
          </form>
        </section>
      </div>

      <DashboardClasses />

      <section className={styles.section} aria-labelledby="kits-title">
        <div className={styles.sectionHead}>
          <h2 id="kits-title" className="h2">
            Your kits
          </h2>
        </div>
        <ul className={styles.kits}>
          {[...kits]
            .sort((a, b) => Number(access.grants.kitIds.has(b.id) || access.grants.subscription) - Number(access.grants.kitIds.has(a.id) || access.grants.subscription))
            .map((k) => {
            const open = access.grants.kitIds.has(k.id) || access.grants.subscription;
            return (
              <li key={k.id} className={`${styles.kit} ${open ? styles.kitOpen : ""}`}>
                <div className={styles.kitArt}>
                  <KitArt kit={k.slug} />
                </div>
                <div className={styles.kitBody}>
                  <span className={open ? "badge badge-kit" : "badge badge-plain"}>{open ? (access.grants.kitIds.has(k.id) ? "Unlocked" : "Via subscription") : "Locked"}</span>
                  <h3 className="h4">
                    <Link href={`/kits/${k.slug}`} className={styles.kitLink}>
                      {k.name}
                    </Link>
                  </h3>
                  <p className="hint">
                    {k.gradeBand}
                    {!open && (
                      <>
                        {" · "}
                        <Link href="/redeem" className="link">
                          Redeem a code
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="recent-title">
        <h2 id="recent-title" className="h2">
          Recently opened
        </h2>
        {recent.length ? (
          <ul className={styles.recent}>
            {recent.map(({ item, at }) => (
              <li key={item.id}>
                <Link href={contentHref(item)} className={styles.recentLink}>
                  <span className="eyebrow">{TYPE_LABEL[item.type]}</span>
                  <span className={styles.recentTitle}>{item.title}</span>
                  <span className="hint">{at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Nothing yet. Open one of your kits above, or <Link href="/catalog" className="link">browse the catalog</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
