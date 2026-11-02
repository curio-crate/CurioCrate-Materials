"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./home.module.css";

const ITEMS = [
  { title: "Predict: what will glow?", type: "Lesson", icon: "instructions", min: 20 },
  { title: "Find your limit", type: "Online lab", icon: "lab", min: 35 },
  { title: "Why luminol glows", type: "Video", icon: "video", min: 6 },
  { title: "Evidence log", type: "Handout", icon: "pdf", min: 15 },
] as const;

/**
 * The home page's product preview: a sample class a visitor can click. It shows what the site does (assign
 * lessons, track seats) instead of describing it. Purely visual; nothing is saved.
 * The one orchestrated moment on the page: students "join" one by one as it appears.
 */
export function HeroPreview({ maxStudents }: { maxStudents: number }) {
  const [assigned, setAssigned] = useState<boolean[]>([true, true, false, false]);
  const [joined, setJoined] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = 24;
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? target : 1;
    const id = window.setInterval(() => setJoined((n) => (n >= target ? (window.clearInterval(id), n) : Math.min(target, n + step))), 45);
    return () => window.clearInterval(id);
  }, []);

  // A slight tilt toward the pointer (mouse only), so the card feels like an object on the bench.
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -3}deg`);
    el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 4}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  const count = assigned.filter(Boolean).length;
  return (
    <div className={styles.previewWrap} onPointerMove={onMove} onPointerLeave={onLeave} data-cap="lum">
      <div ref={ref} className={styles.preview} role="group" aria-label="Example class (try assigning lessons)">
        <div className={styles.pvHead}>
          <div>
            <span className={styles.pvKicker}>
              <span className="sx-dot" aria-hidden="true" /> Example class
            </span>
            <strong className={styles.pvTitle}>Period 3 Forensic Science</strong>
          </div>
          <code className="sx-ticket sx-ticket-sm" aria-label="Class code KQWMTR">
            KQWMTR
          </code>
        </div>
        <div className={styles.pvSeats}>
          <span>
            <strong>{joined}</strong> of {maxStudents} students joined
          </span>
          <span className={styles.pvBar} aria-hidden="true">
            <span style={{ width: `${(joined / maxStudents) * 100}%` }} />
          </span>
        </div>
        <ul className={styles.pvList}>
          {ITEMS.map((it, i) => (
            <li key={it.title}>
              <span className={styles.pvIcon} aria-hidden="true">
                <Icon name={it.icon} size={16} />
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
        <p className={styles.pvFoot} aria-live="polite">
          <Icon name="check" size={14} />
          <span>
            <strong key={count} className={styles.pvCount}>
              {count}
            </strong>{" "}
            assigned. Students see only these.
          </span>
        </p>
      </div>
    </div>
  );
}
