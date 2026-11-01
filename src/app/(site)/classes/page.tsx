import type { Metadata } from "next";
import { Notice } from "@/app/admin/Notice";
import { PageHead } from "@/components/ui/PageHead";
import { requireSchool } from "@/lib/auth/viewer";
import { MAX_CLASSES_PER_TEACHER, MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { assignedCounts, classesFor } from "@/lib/classes";
import { createClassAction } from "./actions";
import { ClassCard } from "./ClassCard";
import styles from "./classes.module.css";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage(props: PageProps<"/classes">) {
  const sp = await props.searchParams;
  const v = await requireSchool("/classes");
  const rows = await classesFor(v.teacher.id);
  const counts = await assignedCounts(rows.map((r) => r.c.id));
  const atLimit = rows.length >= MAX_CLASSES_PER_TEACHER;
  return (
    <div className="container-wide">
      <PageHead eyebrow={`${rows.length} of ${MAX_CLASSES_PER_TEACHER} classes`} size="h1" title="Your classes" lead={`Each class has its own join code and seats up to ${MAX_STUDENTS_PER_CLASS} students. Students never need an account, a name or an email.`} />
      <Notice sp={sp} />
      <div className={styles.listLayout}>
        <ul className={styles.classGrid}>
          {rows.map(({ c, students }) => (
            <li key={c.id} className="reveal">
              <ClassCard id={c.id} name={c.name} code={c.classCode} students={students} assigned={counts.get(c.id) ?? 0} />
            </li>
          ))}
          {!rows.length && <li className="muted">No classes yet. Create your first one.</li>}
        </ul>
        <form action={createClassAction} className={`card ${styles.newForm}`} id="new" aria-labelledby="new-h">
          <h2 id="new-h" className="h3">
            New class
          </h2>
          {atLimit ? (
            <p className="alert alert-warning">You have {MAX_CLASSES_PER_TEACHER} classes, the most allowed. Delete one to make room.</p>
          ) : (
            <>
              <div className="field">
                <label className="label" htmlFor="class-name">
                  Class name
                </label>
                <input id="class-name" name="name" className="input" placeholder="Period 3 Science" required maxLength={60} />
              </div>
              <button className="btn btn-solid">Create class</button>
              <p className={styles.limitNote}>
                {MAX_CLASSES_PER_TEACHER - rows.length} of {MAX_CLASSES_PER_TEACHER} left.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
