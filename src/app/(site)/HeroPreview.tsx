"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./home.module.css";

const ITEMS = [
  { title: "Predict: what will glow?", type: "Lesson", icon: "instructions", min: 20 },
  { title: "Find your limit", type: "Online lab", icon: "lab", min: 35 },
  { title: "Why luminol glows", type: "Video", icon: "video", min: 6 },
  { title: "Evidence log", type: "Handout", icon: "pdf", min: 15 },
] as const;

/**
 * The home page's product shot: a sample class a visitor can click. It shows what the site does (assign lessons,
 * fill seats) instead of describing it. Purely visual; nothing is saved.
 * The one orchestrated moment on the page: students "join" one by one as it appears.
 */
export function HeroPreview({ maxStudents }: { maxStudents: number }) {
  const [assigned, setAssigned] = useState<boolean[]>([true, true, false, false]);
  const [joined, setJoined] = useState(0);

  useEffect(() => {
    const target = 24;
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? target : 1;
    const id = window.setInterval(() => setJoined((n) => (n >= target ? (window.clearInterval(id), n) : Math.min(target, n + step))), 45);
    return () => window.clearInterval(id);
  }, []);

  const count = assigned.filter(Boolean).length;
  return (
    <div className={styles.preview} role="group" aria-label="Example class (try assigning lessons)">
      <div className={styles.pvSide}>
        <span className={styles.pvKicker}>Example class</span>
        <strong className={styles.pvTitle}>Period 3 Forensic Science</strong>
        <span className={styles.pvCodeRow}>
          <span>Join code</span>
          <code className="sx-ticket sx-ticket-sm" aria-label="Class code KQWMTR">
            KQWMTR
          </code>
        </span>
        <span className={styles.pvSeats}>
          <span>
            <strong>{joined}</strong> of {maxStudents} students joined
          </span>
          {/* One square per seat; each lights up as a student joins. */}
          <span className={styles.pvSeatGrid} aria-hidden="true">
            {Array.from({ length: maxStudents }, (_, i) => (
              <span key={i} className={i < joined ? styles.pvSeatOn : undefined} />
            ))}
          </span>
        </span>
      </div>
      <div className={styles.pvMain}>
        <div className={styles.pvMainHead}>
          <strong>Luminol Forensics Kit</strong>
          <span aria-live="polite">
            <strong key={count} className={styles.pvCount}>
              {count}
            </strong>{" "}
            of {ITEMS.length} assigned
          </span>
        </div>
        <ul className={styles.pvList}>
          {ITEMS.map((it, i) => (
            <li key={it.title}>
              <span className={styles.pvIcon} aria-hidden="true">
                <Icon name={it.icon} size={18} />
              </span>
              <span className={styles.pvItem}>
                <span className={styles.pvItemTitle}>{it.title}</span>
                <span className={styles.pvMeta}>
                  <span>{it.type}</span>
                  <span>{it.min} min</span>
                </span>
              </span>
              <button
                type="button"
                className="sx-switch"
                aria-pressed={assigned[i]}
                aria-label={`${assigned[i] ? "Unassign" : "Assign"} ${it.title}`}
                onClick={() => setAssigned((a) => a.map((v, j) => (j === i ? !v : v)))}
              />
            </li>
          ))}
        </ul>
        <p className={styles.pvFoot}>
          <Icon name="check" size={15} /> Students see only what&apos;s switched on.
        </p>
      </div>
    </div>
  );
}
