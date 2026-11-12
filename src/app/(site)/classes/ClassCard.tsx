import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import styles from "./classes.module.css";

/**
 * One class at a glance: name, join code, seats used and how much is assigned. Links to the class page.
 * `compact`: a single row for the dashboard's side column.
 */
export function ClassCard({ id, name, code, students, assigned, compact = false }: { id: string; name: string; code: string; students: number; assigned: number; compact?: boolean }) {
  const pct = Math.min(100, (students / MAX_STUDENTS_PER_CLASS) * 100);
  const full = students >= MAX_STUDENTS_PER_CLASS;
  const meter = (
    <span className={`${styles.meter} ${full ? styles.meterFull : ""}`} aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
  if (compact)
    return (
      <Link href={`/classes/${id}`} className={styles.classRow}>
        <span className={styles.classRowMain}>
          <span className={styles.className}>{name}</span>
          <span className={styles.classRowMeta}>
            {students} of {MAX_STUDENTS_PER_CLASS} students, {assigned} assigned
          </span>
          {meter}
        </span>
        <code className="sx-ticket sx-ticket-sm">
          <span className="sr-only">Class code </span>
          {code}
        </code>
      </Link>
    );
  return (
    <Link href={`/classes/${id}`} className={`card card-link ${styles.classCard}`}>
      <span className={styles.classTop}>
        <span className={styles.className}>{name}</span>
        <Icon name="arrow" size={16} />
      </span>
      <code className={`sx-ticket sx-ticket-sm ${styles.classCode}`}>
        <span className="sr-only">Class code </span>
        {code}
      </code>
      <span className={styles.seats}>
        <span>
          <strong>{students}</strong> of {MAX_STUDENTS_PER_CLASS} students
        </span>
        <span>
          <strong>{assigned}</strong> assigned
        </span>
      </span>
      {meter}
    </Link>
  );
}
