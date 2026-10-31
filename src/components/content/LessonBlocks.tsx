import type { Block } from "@/db/schema";
import { Icon } from "../ui/Icon";
import styles from "./lesson.module.css";

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className={styles.blocks}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className={styles.p}>
                {b.text}
              </p>
            );
          case "h":
            return (
              <h2 key={i} id={slugify(b.text)} className={`h3 ${styles.h}`}>
                {b.text}
              </h2>
            );
          case "list":
            return (
              <ul key={i} className={styles.list}>
                {b.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className={styles.steps}>
                {b.items.map((t, n) => (
                  <li key={t}>
                    <span className={styles.stepN} aria-hidden="true">
                      {String(n + 1).padStart(2, "0")}
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            );
          case "materials":
            return (
              <section key={i} className={styles.materials} aria-label="Materials">
                <h3 className="eyebrow">Materials</h3>
                <ul>
                  {b.items.map((t) => (
                    <li key={t} className="chip chip-blue">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            );
          case "callout":
            return (
              <aside key={i} className={`${styles.callout} ${styles[`tone_${b.tone}`]}`} aria-label={b.title}>
                <span className={styles.calloutIcon} aria-hidden="true">
                  <Icon name={b.tone === "safety" ? "spark" : b.tone === "tip" ? "lab" : "users"} size={18} />
                </span>
                <div>
                  <p className={styles.calloutTitle}>{b.title}</p>
                  <p className={styles.calloutText}>{b.text}</p>
                </div>
              </aside>
            );
          case "explain":
            return (
              <section key={i} className={styles.explain} aria-label="Explain box">
                <span className="eyebrow">Explain</span>
                <p>{b.prompt}</p>
                <div className={styles.lines} aria-hidden="true" />
              </section>
            );
          case "table":
            return (
              <div key={i} className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {b.head.map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((cell, ci) => (ci === 0 ? <th key={ci} scope="row">{cell}</th> : <td key={ci}>{cell}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
