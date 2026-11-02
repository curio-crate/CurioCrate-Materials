"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./dashboard.module.css";

export type FinderItem = {
  id: string;
  title: string;
  summary: string;
  type: string;
  typeLabel: string;
  minutes: number | null;
  kitName: string;
  cap: string;
  href: string;
  locked: boolean;
  search: string; // lowercased haystack: title, summary, kit, type, section, NGSS codes
};

/** Splits `text` around the first match of `term` so it can be marked. */
function Marked({ text, terms }: { text: string; terms: string[] }) {
  const lower = text.toLowerCase();
  const term = terms.find((t) => lower.includes(t));
  if (!term) return <>{text}</>;
  const i = lower.indexOf(term);
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

/**
 * Search every lesson, lab, handout and training across the teacher's kits. Typing (or picking a type) swaps the
 * dashboard below for a results list; clearing brings it back. "/" focuses the box from anywhere; Escape clears.
 */
export function MaterialFinder({ items, children }: { items: FinderItem[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const deferred = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const types = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const it of items) m.set(it.type, { label: it.typeLabel, n: (m.get(it.type)?.n ?? 0) + 1 });
    return [...m.entries()].map(([k, v]) => ({ id: k, ...v }));
  }, [items]);

  const terms = deferred.toLowerCase().split(/\s+/).filter(Boolean);
  const active = terms.length > 0 || type !== "all";
  const results = useMemo(() => {
    if (!active) return [];
    return items
      .filter((it) => (type === "all" || it.type === type) && terms.every((t) => it.search.includes(t)))
      .sort((a, b) => Number(a.locked) - Number(b.locked) || Number(!terms.some((t) => a.title.toLowerCase().includes(t))) - Number(!terms.some((t) => b.title.toLowerCase().includes(t))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, type, deferred, active]);

  const clear = () => {
    setQuery("");
    setType("all");
    input.current?.focus();
  };

  return (
    <>
      <div className={styles.finder} role="search">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search your materials
        </label>
        <div className={styles.searchBox}>
          <Icon name="search" size={18} />
          <input
            ref={input}
            id={`${id}-q`}
            type="search"
            className={styles.searchInput}
            placeholder="Search lessons, labs and handouts by name, kit or standard"
            value={query}
            autoComplete="off"
            aria-controls={`${id}-r`}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (query || type !== "all") && (e.preventDefault(), clear())}
          />
          {active ? (
            <button type="button" className={styles.clear} onClick={clear}>
              Clear
            </button>
          ) : (
            <kbd className={styles.kbd} aria-hidden="true">
              /
            </kbd>
          )}
        </div>
        {types.length > 1 && (
          <ul className="sx-chips" aria-label="Type">
            {types.map((t) => (
              <li key={t.id}>
                <button type="button" className="sx-chip" aria-pressed={type === t.id} onClick={() => setType((cur) => (cur === t.id ? "all" : t.id))}>
                  {t.label} <span className="sx-chip-count">{t.n}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div id={`${id}-r`} hidden={!active} className={styles.results}>
        <p className={styles.resultsHead} aria-live="polite">
          {results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : ""}
        </p>
        {results.length ? (
          <ul className={styles.resultList}>
            {results.map((r, i) => (
              <li key={r.id} className="sx-item-in" style={{ "--i": i } as React.CSSProperties} data-cap={r.cap}>
                <Link href={r.href} className={styles.result}>
                  <span className={styles.resultIcon} aria-hidden="true">
                    <Icon name={r.type} size={17} />
                  </span>
                  <span className={styles.resultBody}>
                    <span className={styles.resultTitle}>
                      <Marked text={r.title} terms={terms} />
                    </span>
                    <span className={styles.resultMeta}>
                      <span className="sx-dot" aria-hidden="true" /> {r.kitName}
                      <span>{r.typeLabel}</span>
                      {r.minutes && <span>{r.minutes} min</span>}
                    </span>
                  </span>
                  {r.locked ? (
                    <span className={styles.resultLock}>
                      <Icon name="lock" size={13} /> Locked
                    </span>
                  ) : (
                    <Icon name="arrow" size={16} className={styles.resultGo} />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sx-empty">
            <strong>{terms.length ? `Nothing matches “${deferred.trim()}”.` : "Nothing of this type yet."}</strong>
            <span>Try a kit name, a lesson code like A.3, or a standard like MS-PS1-2.</span>
            <button type="button" className="btn btn-sm" onClick={clear}>
              Clear search
            </button>
          </div>
        )}
      </div>

      <div hidden={active}>{children}</div>
    </>
  );
}
