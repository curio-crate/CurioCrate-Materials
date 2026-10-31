import "server-only";
import { unzipSync } from "fflate";
import { signToken } from "./crypto";
import { MAX_PACKAGE_MB, PACKAGE_TYPES_TEXT } from "./files";

// Interactive lessons: pre-built HTML/JavaScript lessons the team uploads as a .zip (with index.html), a single
// .html file, or a single .js file (wrapped in a start page). The package is unpacked into storage and served
// to teachers and assigned students from /api/lesson-pkg/<signed token>/..., inside a sandboxed frame.

export const PACKAGE_TOKEN_AUDIENCE = "lesson-pkg";

/** The address of a lesson's start page. Only call after the access check passes. */
export async function packageUrl(item: { packageKey: string | null; packageEntry: string | null }, ttlSec = 6 * 3600) {
  if (!item.packageKey) return null;
  const token = await signToken({ k: item.packageKey }, ttlSec, PACKAGE_TOKEN_AUDIENCE);
  return `/api/lesson-pkg/${token}/${(item.packageEntry ?? "index.html").split("/").map(encodeURIComponent).join("/")}`;
}

export type PackageFile = { path: string; data: Uint8Array };

const MAX_FILES = 3000;
const MAX_TOTAL = 400 * 1024 * 1024;
const SKIP = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|\.git)(\/|$)/;

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", wasm: "application/wasm",
  glb: "model/gltf-binary", gltf: "model/gltf+json", xml: "application/xml", pdf: "application/pdf", map: "application/json",
};

export const packageMime = (p: string) => TYPES[/\.([a-z0-9]+)$/i.exec(p)?.[1]?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** A safe relative path inside a package, or null for anything that tries to escape it. */
export function cleanPackagePath(p: string) {
  const parts = p.replace(/\\/g, "/").split("/").filter((s) => s && s !== ".");
  if (!parts.length || parts.some((s) => s === ".." || s.includes("\0"))) return null;
  return parts.join("/");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function wrapperPage(title: string, scripts: string[]) {
  return new TextEncoder().encode(
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>html,body{margin:0;height:100%;font-family:system-ui,sans-serif}#app{min-height:100%}</style>\n</head>\n<body>\n<div id="app"></div>\n${scripts.map((s) => `<script src="${esc(s)}"></script>`).join("\n")}\n</body>\n</html>\n`,
  );
}

/** Unpacks an uploaded lesson. Throws an Error with a message the team can act on. */
export function unpackLesson(bytes: Uint8Array, fileName: string, title: string): { files: PackageFile[]; entry: string } {
  if (bytes.length > MAX_PACKAGE_MB * 1024 * 1024) throw new Error(`The lesson is larger than ${MAX_PACKAGE_MB} MB.`);
  const ext = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (ext === "html" || ext === "htm") {
    if (isZip) throw new Error(`“${fileName}” is a zip file renamed to .${ext}.`);
    return { files: [{ path: "index.html", data: bytes }], entry: "index.html" };
  }
  if (ext === "js") {
    if (isZip) throw new Error(`“${fileName}” is a zip file renamed to .js.`);
    return { files: [{ path: "lesson.js", data: bytes }, { path: "index.html", data: wrapperPage(title, ["lesson.js"]) }], entry: "index.html" };
  }
  if (ext !== "zip" || !isZip) throw new Error(`“${fileName}” isn't a lesson package. Upload ${PACKAGE_TYPES_TEXT}.`);

  let count = 0;
  let total = 0;
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(bytes, {
      filter: (f) => {
        if (f.name.endsWith("/") || SKIP.test(f.name)) return false;
        count++;
        total += f.originalSize;
        if (count > MAX_FILES) throw new Error(`The zip has more than ${MAX_FILES} files.`);
        if (total > MAX_TOTAL) throw new Error("The zip unpacks to more than 400 MB.");
        return true;
      },
    });
  } catch (e) {
    throw new Error((e as Error).message.startsWith("The zip") ? (e as Error).message : `“${fileName}” couldn't be opened as a zip file.`);
  }

  let files: PackageFile[] = [];
  for (const [name, data] of Object.entries(raw)) {
    const p = cleanPackagePath(name);
    if (!p) throw new Error(`The zip contains an unsafe path (“${name}”).`);
    files.push({ path: p, data });
  }
  if (!files.length) throw new Error("The zip is empty.");

  // Zips made by "Compress folder" put everything inside one top folder: serve from inside it.
  const tops = new Set(files.map((f) => f.path.split("/")[0]));
  if (tops.size === 1 && files.every((f) => f.path.includes("/"))) {
    const top = [...tops][0];
    files = files.map((f) => ({ ...f, path: f.path.slice(top.length + 1) }));
  }

  const rootHtml = files.filter((f) => !f.path.includes("/") && /\.html?$/i.test(f.path));
  const entry = rootHtml.find((f) => /^index\.html?$/i.test(f.path))?.path ?? (rootHtml.length === 1 ? rootHtml[0].path : null);
  if (entry) return { files, entry };

  const rootJs = files.filter((f) => !f.path.includes("/") && /\.m?js$/i.test(f.path));
  if (rootJs.length && !files.some((f) => f.path === "index.html")) {
    return { files: [...files, { path: "index.html", data: wrapperPage(title, rootJs.map((f) => f.path).sort()) }], entry: "index.html" };
  }
  throw new Error("The zip needs an index.html at the top level (the page the lesson starts on).");
}
