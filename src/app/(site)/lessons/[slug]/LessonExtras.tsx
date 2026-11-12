"use client";

import Link from "next/link";
import { useState } from "react";
import { AssignSwitch } from "@/components/ui/AssignSwitch";
import { Icon } from "@/components/ui/Icon";
import styles from "./lesson-page.module.css";

// Teach this: assign to each class (switches save instantly), print, copy a link, share to Google Classroom.
export function LessonExtras({
  slug,
  contentId,
  title,
  classes,
  lms,
}: {
  slug: string;
  contentId: string;
  title: string;
  classes?: { id: string; name: string; assigned: boolean }[];
  lms?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/lessons/${slug}`;
  return (
    <section className={styles.teach} aria-labelledby="teach-h">
      <h2 id="teach-h" className={styles.asideTitle}>
        Teach this
      </h2>
      {classes && (
        <div className={styles.assign}>
          {classes.length ? (
            <ul className={styles.assignList}>
              {classes.map((c) => (
                <li key={c.id}>
                  <span className={styles.assignName}>{c.name}</span>
                  <AssignSwitch classId={c.id} contentId={contentId} slug={slug} title={title} label={c.name} initial={c.assigned} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">
              <Link href="/classes#new" className="link">
                Create a class
              </Link>{" "}
              to assign this lesson.
            </p>
          )}
        </div>
      )}
      <div className={styles.extras}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
          <Icon name="print" size={15} /> Print
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          aria-label={`Copy link to ${title}`}
          title="Paste it into Canvas, Schoology or any LMS"
          onClick={async () => {
            await navigator.clipboard?.writeText(url()).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Icon name={copied ? "check" : "share"} size={15} /> {copied ? "Link copied" : "Copy link"}
        </button>
        {lms && (
          <a className="btn btn-sm btn-ghost" href={`https://classroom.google.com/share?url=${encodeURIComponent(`https://materials.curiocrate.org/lessons/${slug}`)}&title=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">
            <Icon name="share" size={15} /> Google Classroom
          </a>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </p>
    </section>
  );
}
