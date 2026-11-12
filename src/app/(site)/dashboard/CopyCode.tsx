"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./dashboard.module.css";

/** A code on a tear-off ticket with a copy button. "Copied" springs in and reverts after 1.8s. */
export function CopyCode({ code, label = "Copy" }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.copy}>
      <code className={`sx-ticket ${styles.code}`} data-testid="join-code">
        {code}
      </code>
      <button
        type="button"
        className="btn btn-sm"
        onClick={async () => {
          await navigator.clipboard?.writeText(code).catch(() => {});
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
      >
        {done ? (
          <span key="done" className={styles.copied}>
            <Icon name="check" size={14} /> Copied
          </span>
        ) : (
          label
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? `${code} copied` : ""}
      </span>
    </div>
  );
}
