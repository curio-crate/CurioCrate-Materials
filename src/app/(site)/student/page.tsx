import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Notice } from "@/app/admin/Notice";
import { ContentRow } from "@/components/content/ContentBits";
import listStyles from "@/components/content/content.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { currentStudent } from "@/lib/classes";
import { contentHref, isShipped, listAllContent, listKits } from "@/lib/content";
import { learnerMayOpen } from "@/lib/guard";
import { currentLearner } from "@/lib/students";
import { deleteAccountAction } from "./actions";
import styles from "./student.module.css";

export const metadata: Metadata = { title: "My learning" };

/** A free student account's home: the free student material of every kit, plus the class they're in (if any). */
export default async function StudentHome(props: PageProps<"/student">) {
  const me = await currentLearner();
  if (!me) redirect("/student/signin");
  const sp = await props.searchParams;
  const [kits, all, inClass] = await Promise.all([listKits(), listAllContent(), currentStudent()]);
  const open = all.filter((c) => !c.parentId && isShipped(c) && learnerMayOpen(c));
  const groups = kits.map((k) => ({ kit: k, items: open.filter((c) => c.kitId === k.id) })).filter((g) => g.items.length);

  return (
    <div className="container">
      <PageHead eyebrow={`Hi, ${me.nickname}`} size="h1" title="My learning" lead="Free lessons, labs and videos from every CurioCrate kit. Your teacher can unlock more in class." />
      {sp.welcome && (
        <p className="alert alert-success" role="status" style={{ marginBottom: 24 }}>
          Your account is ready. Pick anything below to start.
        </p>
      )}
      <Notice sp={sp} />

      <div className={styles.layout}>
        <div className={styles.main}>
          {groups.map(({ kit, items }) => (
            <section key={kit.id} className={`${styles.kit} reveal`} aria-labelledby={`k-${kit.slug}`}>
              <div className={styles.kitHead}>
                <h2 id={`k-${kit.slug}`} className="h3">
                  {kit.name}
                </h2>
                <span className="badge badge-plain">{kit.gradeBand}</span>
              </div>
              <ul className={listStyles.list}>
                {items.map((c) => (
                  <ContentRow key={c.id} item={c} href={contentHref(c)} state="open" />
                ))}
              </ul>
            </section>
          ))}
          {!groups.length && <p className="muted">Nothing free to explore yet. Check back soon.</p>}
        </div>

        <aside className={styles.aside} aria-label="Class and account">
          <div className="card card-pad-sm stack" style={{ gap: 12 }}>
            <h2 className="h4">My class</h2>
            {inClass ? (
              <>
                <p className="hint">You&apos;re in {inClass.c.name}.</p>
                <Link href="/class" className="btn btn-sm">
                  Open my class
                </Link>
              </>
            ) : (
              <form action="/api/join" method="post" className="stack" style={{ gap: 10 }}>
                <label htmlFor="class-code" className="hint">
                  Got a code from your teacher?
                </label>
                <input id="class-code" name="code" className="input input-code" required minLength={6} maxLength={8} autoComplete="off" placeholder="ABCDEF" />
                <button type="submit" className="btn btn-solid btn-sm">
                  Join class
                </button>
              </form>
            )}
          </div>
          <details className={`card card-pad-sm ${styles.account}`}>
            <summary className="h4">My account</summary>
            <p className="hint">
              Signed in as {me.email}. We store only your email, password (scrambled), nickname and birth year.
            </p>
            <form action={deleteAccountAction} className="stack" style={{ gap: 10 }}>
              <label className="checkbox">
                <input type="checkbox" name="confirm" required />
                <span>Delete my account and everything in it. This can&apos;t be undone.</span>
              </label>
              <button type="submit" className="btn btn-sm btn-danger">
                Delete my account
              </button>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
