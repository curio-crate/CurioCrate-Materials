// File types the Studio accepts for handouts and resources (shared by the Studio UI and the server).
// Each upload is checked by its extension AND its first bytes, so a renamed file can't slip through.

export type FileKind = { ext: string; label: string; mime: string; magic: "pdf" | "zip" | "png" | "jpg" };

const OFFICE = "application/vnd.openxmlformats-officedocument";
const KINDS: FileKind[] = [
  { ext: "pdf", label: "PDF", mime: "application/pdf", magic: "pdf" },
  { ext: "docx", label: "Word", mime: `${OFFICE}.wordprocessingml.document`, magic: "zip" },
  { ext: "pptx", label: "Slides", mime: `${OFFICE}.presentationml.presentation`, magic: "zip" },
  { ext: "xlsx", label: "Sheet", mime: `${OFFICE}.spreadsheetml.sheet`, magic: "zip" },
  { ext: "png", label: "Image", mime: "image/png", magic: "png" },
  { ext: "jpg", label: "Image", mime: "image/jpeg", magic: "jpg" },
  { ext: "jpeg", label: "Image", mime: "image/jpeg", magic: "jpg" },
];

export const MAX_FILE_MB = 50;
export const FILE_ACCEPT = KINDS.map((k) => `.${k.ext}`).join(",");
export const FILE_TYPES_TEXT = "PDF, Word, PowerPoint, Excel, PNG or JPG";

export function fileKind(name: string | null | undefined): FileKind | null {
  const ext = /\.([a-z0-9]+)$/i.exec(name ?? "")?.[1]?.toLowerCase();
  return KINDS.find((k) => k.ext === ext) ?? null;
}

/** Short label teachers see on the download button ("PDF", "Word", ...). */
export const fileLabel = (name: string | null | undefined) => fileKind(name)?.label ?? "PDF";

export const mimeFor = (name: string | null | undefined) => fileKind(name)?.mime ?? "application/octet-stream";

export function looksLike(kind: FileKind, head: Uint8Array) {
  const b = (...xs: number[]) => xs.every((x, i) => head[i] === x);
  switch (kind.magic) {
    case "pdf": return b(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
    case "zip": return b(0x50, 0x4b, 0x03, 0x04); // PK.. (Office files are zip packages)
    case "png": return b(0x89, 0x50, 0x4e, 0x47);
    case "jpg": return b(0xff, 0xd8, 0xff);
  }
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** "Lab worksheet_v2.pdf" -> "Lab worksheet v2" */
export const titleFromFileName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

// ---------- Videos ----------
export const VIDEO_ACCEPT = ".mp4,.mov,.m4v,.webm";
export const MAX_VIDEO_MB = 4000;
export const isVideoName = (name: string) => /\.(mp4|mov|m4v|webm)$/i.test(name);
export const videoMime = (name: string) => (/\.webm$/i.test(name) ? "video/webm" : /\.mov$/i.test(name) ? "video/quicktime" : "video/mp4");

/** MP4/MOV boxes ("ftyp", "moov", "mdat", "free", "wide") or the WebM/Matroska magic number. */
export function looksLikeVideo(head: Uint8Array) {
  const box = String.fromCharCode(...head.subarray(4, 8));
  return ["ftyp", "moov", "mdat", "free", "wide", "skip"].includes(box) || (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3);
}

// ---------- Interactive (HTML/JavaScript) lessons ----------
export const PACKAGE_ACCEPT = ".zip,.html,.htm,.js";
export const PACKAGE_TYPES_TEXT = "a .zip with index.html, a single .html file, or a .js file";
export const MAX_PACKAGE_MB = 200;
export const isPackageName = (name: string) => /\.(zip|html?|js)$/i.test(name);
