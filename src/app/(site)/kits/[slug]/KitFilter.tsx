"use client";

import { useState, type ReactNode } from "react";
import styles from "./kit.module.css";

/**
 * Filter chips over a kit's material groups. The groups are rendered on the server inside this wrapper; choosing a
 * chip hides the others with CSS (data-filter), and the groups that stay replay their entrance. Without JavaScript
 * everything simply shows.
 */
export function KitFilter({ groups, children }: { groups: { id: string; title: string; count: number }[]; children: ReactNode }) {
  const [filter, setFilter] = useState("all");
  const total = groups.reduce((n, g) => n + g.count, 0);
  const chips = [{ id: "all", title: "Everything", count: total }, ...groups];
  return (
    <>
      {groups.length > 1 && (
        <div className={styles.toolbar} role="group" aria-label="Show">
          <ul className="sx-chips">
            {chips.map((c) => (
              <li key={c.id}>
                <button type="button" className="sx-chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                  {c.title} <span className="sx-chip-count">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.groups} data-filter={filter}>
        {children}
      </div>
    </>
  );
}
