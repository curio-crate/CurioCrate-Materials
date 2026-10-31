"use client";

// Studio uploads go straight from the browser to storage (cloud bucket or Mux), so file size isn't limited by the
// web server: 1) ask the server where to send the file, 2) PUT it there with progress, 3) ask the server to check
// the stored bytes and make it live.

export type UploadPurpose = "file" | "video" | "package";
export type CompleteExtra = { contentId?: string; create?: { kitId?: string; parentId?: string; tier?: string; title?: string; summary?: string; type?: "pdf" | "manual" } };
export type UploadResult = { ok: true; status: "ready" | "processing"; id?: string; files?: number; entry?: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (r.status === 401) throw new Error("Your Studio sign-in expired. Sign in again in another tab, then retry.");
  if (!r.ok) throw new Error(data.error ?? "Upload failed.");
  return data;
}

function put(url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage refused the upload (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection (or the bucket's CORS settings)."));
    xhr.send(file);
  });
}

/** Reads a video's length in the browser, so captions can be timed before any server processing. */
function videoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

export async function studioUpload(file: File, purpose: UploadPurpose, extra: CompleteExtra, onProgress: (pct: number) => void): Promise<UploadResult> {
  const target = await post<{ provider: "storage" | "mux"; url: string; headers: Record<string, string>; key?: string; uploadId?: string }>("/api/admin/uploads/sign", { purpose, name: file.name, size: file.size });
  const durationSec = purpose === "video" ? await videoDuration(file) : null;
  await put(target.url, file, target.headers, onProgress);
  return post<UploadResult>("/api/admin/uploads/complete", { purpose, key: target.key, muxUploadId: target.uploadId, name: file.name, durationSec, ...extra });
}
