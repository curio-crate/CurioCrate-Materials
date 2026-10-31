"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FILE_ACCEPT, FILE_TYPES_TEXT, PACKAGE_ACCEPT, PACKAGE_TYPES_TEXT, VIDEO_ACCEPT } from "@/lib/files";
import { studioUpload } from "../upload-client";

const LABEL = {
  video: "Video file (MP4, MOV or WebM)",
  file: `PDF file (or ${FILE_TYPES_TEXT.replace("PDF, ", "")})`,
  package: `Lesson package (${PACKAGE_TYPES_TEXT})`,
};
const ACCEPT = { video: VIDEO_ACCEPT, file: FILE_ACCEPT, package: PACKAGE_ACCEPT };

// Upload or replace the file behind one content item, with a progress bar. The file goes straight to storage.
export function Uploader({ contentId, kind, current }: { contentId: string; kind: "video" | "file" | "package"; current: string }) {
  const router = useRouter();
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (file: File) => {
    setMsg(null);
    setPct(0);
    try {
      const r = await studioUpload(file, kind, { contentId }, setPct);
      setMsg({
        ok: true,
        text:
          r.status === "processing"
            ? "Uploaded. Processing the video (renditions, download, poster); it goes live automatically."
            : kind === "package"
              ? `Uploaded. It's live (${r.files} file${r.files === 1 ? "" : "s"}, starts at ${r.entry}).`
              : "Uploaded. It's live.",
      });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setPct(null);
    }
  };

  return (
    <div className="field">
      <label className="label" htmlFor={`file-${kind}`}>
        {LABEL[kind]}
      </label>
      <input id={`file-${kind}`} type="file" className="input" style={{ paddingTop: 10 }} accept={ACCEPT[kind]} onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} disabled={pct !== null} />
      <p className="hint">Current: {current}</p>
      {pct !== null && (
        <progress max={100} value={pct} aria-label="Upload progress" style={{ width: "100%" }}>
          {pct}%
        </progress>
      )}
      <div aria-live="polite">{msg && <p className={`alert ${msg.ok ? "alert-success" : "alert-danger"}`}>{msg.text}</p>}</div>
    </div>
  );
}
