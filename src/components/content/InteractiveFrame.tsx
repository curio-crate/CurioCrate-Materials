"use client";

import { useRef } from "react";
import styles from "./content.module.css";

// An uploaded HTML/JavaScript lesson. The frame is sandboxed without same-origin access, so the lesson's code
// can't reach the teacher's session, cookies or this site's pages.
export function InteractiveFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <div className={styles.interactive}>
      <iframe
        ref={frame}
        src={src}
        title={title}
        className={styles.interactiveFrame}
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock"
        allow="fullscreen; autoplay"
        referrerPolicy="no-referrer"
        loading="lazy"
        data-testid="interactive-lesson"
      />
      <div className={styles.interactiveBar}>
        <button type="button" className="btn btn-xs btn-outline" onClick={() => frame.current?.requestFullscreen?.().catch(() => {})}>
          Full screen
        </button>
      </div>
    </div>
  );
}
