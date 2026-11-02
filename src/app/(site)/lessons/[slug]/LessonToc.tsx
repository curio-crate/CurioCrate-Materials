"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./lesson-page.module.css";

export type TocItem = { id: string; label: string; icon?: string };

/**
 * "On this page" with a position marker: the section nearest the top of the screen is highlighted, and the marker
 * slides to it. Uses data-active (not aria-current) so it never collides with the video transcript's current cue.
 */
export function LessonToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  if (!items.length) return null;
  const index = Math.max(0, items.findIndex((i) => i.id === active));
  return (
    <nav className={styles.tocBlock} aria-labelledby="toc-h">
      <h2 id="toc-h" className={styles.asideTitle}>
        On this page
      </h2>
      <ul className={styles.toc} style={{ "--toc-i": index } as React.CSSProperties}>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} data-active={i.id === active || undefined} onClick={() => setActive(i.id)}>
              {i.icon && <Icon name={i.icon} size={14} />} {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
