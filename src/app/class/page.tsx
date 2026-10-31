import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { assignments, currentStudent } from "@/lib/classes";
import { contentHref, TYPE_LABEL } from "@/lib/content";
import { features } from "@/lib/features";
import { CurieChat } from "@/components/curie/CurieChat";
import styles from "@/components/content/content.module.css";

export const metadata: Metadata = { title: "My class" };

export default async function StudentClass() {
  const st = await currentStudent();
  if (!st) redirect("/join");
  const items = await assignments(st.c.id);
  return (
    <div className="container">
      <PageHead eyebrow={`Hi, ${st.s.nickname}`} size="h1" title={st.c.name} lead={`Your teacher: ${st.teacher.name}. Open what's been assigned below.`} />
      <ul className={styles.list}>
        {items.map(({ item }) => (
          <li key={item.id} className={styles.row}>
            <span className={styles.typeIcon} aria-hidden="true">
              <Icon name={item.type} size={20} />
            </span>
            <div className={styles.rowBody}>
              <span className="eyebrow">{TYPE_LABEL[item.type]}</span>
              <Link href={contentHref(item)} className={styles.rowTitle}>
                {item.title}
              </Link>
              <p className={styles.rowSummary}>{item.summary}</p>
            </div>
            <span className={styles.state} aria-hidden="true">
              <Icon name="arrow" size={18} />
            </span>
          </li>
        ))}
        {!items.length && <li className="muted">Nothing assigned yet. Check back when your teacher says so.</li>}
      </ul>
      {features.curie && st.c.curieEnabled && (
        <section style={{ marginTop: 56 }} aria-labelledby="curie-h">
          <h2 id="curie-h" className="h3" style={{ marginBottom: 16 }}>
            Ask Curie
          </h2>
          <CurieChat lessons={items.filter(({ item }) => item.type !== "pdf").map(({ item }) => ({ slug: item.slug, title: item.title }))} />
        </section>
      )}
    </div>
  );
}
