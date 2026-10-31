"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./lesson-page.module.css";

// Teach this: print, share link, assign to a class (Phase 2), share to Google Classroom / LMS (Phase 3).
export function LessonExtras({ slug, title, classes, lms }: { slug: string; title: string; classes?: { id: string; name: string; assigned: boolean }[]; lms?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [assigned, setAssigned] = useState<Record<string, boolean>>(Object.fromEntries((classes ?? []).map((c) => [c.id, c.assigned])));
  const url = () => `${window.location.origin}/lessons/${slug}`;
  return (
    <div className={`card ${styles.asideCard}`}>
      <h2 className="eyebrow">Teach this</h2>
      <div className={styles.extras}>
        <button type="button" className="btn btn-sm btn-block" onClick={() => window.print()}>
          <Icon name="print" size={15} /> Print lesson
        </button>
        <button type="button" className="btn btn-sm btn-block" aria-label={`Copy link to ${title}`} onClick={async () => { await navigator.clipboard?.writeText(url()).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          <Icon name="share" size={15} /> {copied ? "Link copied" : "Copy link (Canvas, Schoology…)"}
        </button>
        {lms && (
          <a className="btn btn-sm btn-block" href={`https://classroom.google.com/share?url=${encodeURIComponent(`https://materials.curiocrate.org/lessons/${slug}`)}&title=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">
            <Icon name="share" size={15} /> Share to Google Classroom
          </a>
        )}
        {classes?.map((c) => (
          <button key={c.id} type="button" className={`btn btn-sm btn-block ${assigned[c.id] ? "btn-kit" : ""}`} aria-pressed={assigned[c.id]} onClick={async () => {
            const on = !assigned[c.id];
            const fd = new FormData();
            fd.set("classId", c.id);
            fd.set("slug", slug);
            fd.set("on", on ? "1" : "0");
            const r = await fetch("/api/classes/assign", { method: "POST", body: fd });
            if (r.ok) setAssigned((a) => ({ ...a, [c.id]: on }));
          }}>
            {assigned[c.id] ? `Assigned to ${c.name} ✓` : `Assign to ${c.name}`}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{copied ? "Link copied to clipboard" : ""}</p>
    </div>
  );
}
