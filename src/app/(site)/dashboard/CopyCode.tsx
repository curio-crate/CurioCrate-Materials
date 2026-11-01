"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

export function CopyCode({ code, label = "Copy" }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.copy}>
      <code className={styles.code} data-testid="join-code">
        {code}
      </code>
      <button
        type="button"
        className="btn btn-xs"
        onClick={async () => {
          await navigator.clipboard?.writeText(code).catch(() => {});
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
      >
        {done ? "Copied" : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? `${code} copied` : ""}
      </span>
    </div>
  );
}
