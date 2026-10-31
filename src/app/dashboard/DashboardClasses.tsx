import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { classesFor } from "@/lib/classes";
import { features } from "@/lib/features";
import styles from "./dashboard.module.css";

export async function DashboardClasses() {
  if (!features.classes) return null;
  const v = await getViewer();
  if (!v) return null;
  const rows = await classesFor(v.teacher.id);
  return (
    <section className={styles.section} aria-labelledby="classes-title">
      <div className={styles.sectionHead}>
        <h2 id="classes-title" className="h2">Classes</h2>
        <Link href="/classes" className="btn btn-outline btn-sm">Manage classes</Link>
      </div>
      <ul className={styles.recent}>
        {rows.slice(0, 6).map(({ c, students }) => (
          <li key={c.id}>
            <Link href={`/classes/${c.id}`} className={styles.recentLink}>
              <span className="eyebrow">Code {c.classCode}</span>
              <span className={styles.recentTitle}>{c.name}</span>
              <span className="hint">{students} student device{students === 1 ? "" : "s"}</span>
            </Link>
          </li>
        ))}
        {!rows.length && <li className="muted">No classes yet. <Link href="/classes" className="link">Create one</Link> to share lessons and labs with students.</li>}
      </ul>
    </section>
  );
}
