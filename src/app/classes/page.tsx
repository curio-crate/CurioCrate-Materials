import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/app/admin/Notice";
import styles from "@/app/dashboard/dashboard.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { requireSchool } from "@/lib/auth/viewer";
import { classesFor } from "@/lib/classes";
import { createClassAction } from "./actions";

export const metadata: Metadata = { title: "My classes" };

export default async function ClassesPage(props: PageProps<"/classes">) {
  const sp = await props.searchParams;
  const v = await requireSchool("/classes");
  const rows = await classesFor(v.teacher.id);
  return (
    <div className="container">
      <PageHead eyebrow="Classes" size="h1" title="Your classes" lead="Students join with a 6-letter class code. No student accounts, names or emails." />
      <Notice sp={sp} />
      <div className={styles.top}>
        <ul className="stack" style={{ gap: 12 }}>
          {rows.map(({ c, students }) => (
            <li key={c.id} className={`card ${styles.action}`} style={{ justifyContent: "space-between" }}>
              <span>
                <Link href={`/classes/${c.id}`} className="h4">{c.name}</Link>
                <span className="hint">{students} student device{students === 1 ? "" : "s"} · Curie.AI {c.curieEnabled ? "on" : "off"}</span>
              </span>
              <code className={styles.code}>{c.classCode}</code>
            </li>
          ))}
          {!rows.length && <li className="muted">No classes yet. Create your first one.</li>}
        </ul>
        <form action={createClassAction} className={`card ${styles.school}`}>
          <h2 className="h4">New class</h2>
          <div className="field">
            <label className="label" htmlFor="class-name">Class name</label>
            <input id="class-name" name="name" className="input" placeholder="Period 3 Science" required />
          </div>
          <button className="btn btn-solid">Create class</button>
        </form>
      </div>
    </div>
  );
}
