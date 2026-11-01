import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import styles from "./classes.module.css";

/** One class at a glance: name, join code, seats used and how much is assigned. Links to the class page. */
export function ClassCard({ id, name, code, students, assigned }: { id: string; name: string; code: string; students: number; assigned: number }) {
  const pct = Math.min(100, (students / MAX_STUDENTS_PER_CLASS) * 100);
  return (
    <Link href={`/classes/${id}`} className={`card card-link ${styles.classCard}`}>
      <span className={styles.classTop}>
        <span className={styles.className}>{name}</span>
        <Icon name="arrow" size={16} />
      </span>
      <span className={styles.classCode}>
        <span className="sr-only">Class code </span>
        {code}
      </span>
      <span className={styles.seats}>
        <span>
          {students} / {MAX_STUDENTS_PER_CLASS} students
        </span>
        <span>{assigned} assigned</span>
      </span>
      <span className={`${styles.meter} ${students >= MAX_STUDENTS_PER_CLASS ? styles.meterFull : ""}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
