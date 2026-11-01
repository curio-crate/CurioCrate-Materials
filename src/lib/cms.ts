import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { cueSeconds } from "@/content/lessons";
import { db } from "@/db";
import { auditLog, contentItems, kits, kitVersions, type Block, type Cue } from "@/db/schema";
import type { Actor } from "./entitlements";
import { env } from "./env";
import { FILE_TYPES_TEXT, fileKind, isPackageName, isVideoName, looksLike, looksLikeVideo, MAX_FILE_MB, mimeFor, PACKAGE_TYPES_TEXT } from "./files";
import { MATERIAL, MATERIAL_KINDS, type MaterialKind } from "./materials";
import { packageMime, unpackLesson } from "./packages";
import { deleteObject, deletePrefix, getObjectBytes, headObject, MEDIA_DIR, putObject, storageMode } from "./storage";
import { probeSeconds, transcodeToHls } from "./transcode";

// ---------- Lesson body: a simple text format the team can type ----------
//   ## Heading          1. Step           - List item          ? Explain prompt
//   > Safety: text      > Tip: text       > Teacher: text      Materials: a, b, c
//   Any other line is a paragraph. Blank lines separate blocks.
export function parseBody(text: string): Block[] {
  const blocks: Block[] = [];
  const push = <T extends Block>(b: T) => blocks.push(b);
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const last = blocks[blocks.length - 1];
    let m: RegExpExecArray | null;
    if ((m = /^#{1,3}\s+(.+)/.exec(line))) push({ type: "h", text: m[1] });
    else if ((m = /^\d+[.)]\s+(.+)/.exec(line))) {
      if (last?.type === "steps") last.items.push(m[1]);
      else push({ type: "steps", items: [m[1]] });
    } else if ((m = /^[-*]\s+(.+)/.exec(line))) {
      if (last?.type === "list") last.items.push(m[1]);
      else push({ type: "list", items: [m[1]] });
    }
    else if ((m = /^\?\s*(.+)/.exec(line))) push({ type: "explain", prompt: m[1] });
    else if ((m = /^>\s*(safety|tip|teacher)\s*:\s*(.+)/i.exec(line))) {
      const tone = m[1].toLowerCase() as "safety" | "tip" | "teacher";
      push({ type: "callout", tone, title: tone === "safety" ? "Safety" : tone === "tip" ? "Tip" : "Teacher note", text: m[2] });
    } else if ((m = /^materials\s*:\s*(.+)/i.exec(line))) push({ type: "materials", items: m[1].split(",").map((s) => s.trim()).filter(Boolean) });
    else push({ type: "p", text: line });
  }
  return blocks;
}

export function bodyToText(blocks: Block[]) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h": return `## ${b.text}`;
        case "p": return b.text;
        case "steps": return b.items.map((s, i) => `${i + 1}. ${s}`).join("\n");
        case "list": return b.items.map((s) => `- ${s}`).join("\n");
        case "explain": return `? ${b.prompt}`;
        case "callout": return `> ${b.tone[0].toUpperCase()}${b.tone.slice(1)}: ${b.text}`;
        case "materials": return `Materials: ${b.items.join(", ")}`;
        case "table": return [b.head.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n");
      }
    })
    .join("\n\n");
}

/** Captions from pasted/uploaded WebVTT, or plain lines (one caption per line, timed automatically). */
export function parseCaptions(text: string, durationSec?: number | null): Cue[] {
  const t = text.replace(/\r/g, "").trim();
  if (!t) return [];
  if (t.startsWith("WEBVTT")) {
    const secs = (s: string) => s.split(":").reduce((n, part) => n * 60 + Number(part.replace(",", ".")), 0);
    const cues: Cue[] = [];
    for (const block of t.split(/\n\n+/)) {
      const m = /([\d:.,]+)\s*-->\s*([\d:.,]+)[^\n]*\n([\s\S]+)/.exec(block);
      if (m) cues.push({ start: secs(m[1]), end: secs(m[2]), text: m[3].replace(/<[^>]+>/g, "").replace(/\n/g, " ").trim() });
    }
    return cues;
  }
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const natural = lines.map(cueSeconds);
  const total = natural.reduce((a, b) => a + b, 0);
  const scale = durationSec && total ? durationSec / total : 1;
  let at = 0;
  return lines.map((text, i) => {
    const start = Math.round(at * 10) / 10;
    at += natural[i] * scale;
    return { start, end: Math.round(at * 10) / 10, text };
  });
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

async function uniqueSlug(base: string) {
  const d = await db();
  let slug = slugify(base);
  for (let i = 2; (await d.select({ id: contentItems.id }).from(contentItems).where(eq(contentItems.slug, slug))).length; i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

async function audit(actor: Actor, action: string, targetId: string, details: Record<string, unknown> = {}) {
  const d = await db();
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action, targetType: "content", targetId, details });
}

/** Content that other items (videos, handouts) can sit inside. */
export const LESSON_TYPES: ContentInput["type"][] = ["instructions", "interactive", "training"];

// ---------- Kits ----------
export type KitInput = { name: string; code: string; gradeBand: string; gradeMin: number; gradeMax: number; tagline: string; description: string; status: string; accent: string; ngss: string[]; skills: string[]; inTheBox: string[] };

export async function saveKit(actor: Actor, id: string | null, input: KitInput) {
  const d = await db();
  if (id) {
    await d.update(kits).set({ ...input, code: input.code.toUpperCase() }).where(eq(kits.id, id));
    await audit(actor, "kit.update", id);
    return id;
  }
  const [k] = await d
    .insert(kits)
    .values({ ...input, code: input.code.toUpperCase(), slug: slugify(input.name.replace(/\bkit\b/i, "")), shortName: input.name.replace(/\s*kit$/i, "").split(" ").slice(0, 2).join(" "), sortOrder: 100 })
    .returning();
  await d.insert(kitVersions).values({ kitId: k.id, version: "1.0", notes: "Created in Studio" });
  await audit(actor, "kit.create", k.id, { name: k.name });
  return k.id;
}

// ---------- Content ----------
export type ContentInput = {
  kitId: string | null;
  parentId: string | null;
  type: "lab" | "instructions" | "video" | "pdf" | "training" | "interactive" | "manual";
  title: string;
  summary: string;
  requiredTier: "free" | "kit_owner" | "subscription";
  section: string | null;
  minutes: number | null;
  ngss: string[];
  bodyText: string;
  captionsText: string;
  labSlug: string | null;
};

export async function saveContent(actor: Actor, id: string | null, input: ContentInput) {
  const d = await db();
  const [version] = input.kitId ? await d.select().from(kitVersions).where(and(eq(kitVersions.kitId, input.kitId), eq(kitVersions.isCurrent, true))) : [];
  const existing = id ? (await d.select().from(contentItems).where(eq(contentItems.id, id)))[0] : null;
  const values = {
    kitId: input.kitId,
    kitVersionId: version?.id ?? null,
    parentId: input.parentId,
    type: input.type,
    title: input.title.trim(),
    summary: input.summary.trim(),
    requiredTier: input.requiredTier,
    isSample: input.requiredTier === "free",
    section: input.section || null,
    minutes: input.minutes,
    ngss: input.ngss,
    body: parseBody(input.bodyText),
    labSlug: input.type === "lab" ? input.labSlug : null,
    ...(input.captionsText.trim() ? { captions: parseCaptions(input.captionsText, existing?.videoDurationSec) } : {}),
  };
  if (existing) {
    await d.update(contentItems).set(values).where(eq(contentItems.id, existing.id));
    await audit(actor, "content.update", existing.id, { title: values.title });
    return existing;
  }
  const slug = await uniqueSlug(input.title);
  const [row] = await d
    .insert(contentItems)
    .values({ ...values, slug, sortOrder: 1000 + Math.floor(Date.now() / 1000) % 100000 })
    .returning();
  await audit(actor, "content.create", row.id, { title: row.title, type: row.type });
  return row;
}

export async function deleteContent(actor: Actor, id: string) {
  const d = await db();
  const gone = await d.delete(contentItems).where(or(eq(contentItems.id, id), eq(contentItems.parentId, id))).returning();
  await Promise.all(gone.map(deleteStoredMedia));
  await audit(actor, "content.delete", id);
}

// ---------- Uploads ----------
// The Studio browser uploads straight to storage (presigned PUT, see /api/admin/uploads/sign), then calls
// /api/admin/uploads/complete, which lands here. Each file is checked by its first bytes before anything goes
// live; a rejected file is deleted and changes nothing.

export type UploadPurpose = "file" | "video" | "package";

/** Where an incoming upload is stored. Random, so a key can't be guessed and replacing never overwrites. */
export function newUploadKey(purpose: UploadPurpose, name: string) {
  const safe = name.replace(/[^\w.-]/g, "_").slice(-80) || "upload";
  return `uploads/${purpose}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${safe}`;
}

const isUploadKey = (k: string | null | undefined): k is string => !!k && /^uploads\/(file|video|package)\/\d{4}-\d{2}\/[0-9a-f-]{36}-[\w.-]+$/.test(k);

async function itemOrThrow(contentId: string) {
  const d = await db();
  const [item] = await d.select().from(contentItems).where(eq(contentItems.id, contentId));
  if (!item) throw new Error("Content not found");
  return item;
}

/** Checks an uploaded handout/manual (extension, size and first bytes). Deletes it if it is rejected. */
async function checkUploadedFile(key: string, name: string) {
  if (!isUploadKey(key)) throw new Error("Upload not found. Try again.");
  const kind = fileKind(name);
  const fail = async (msg: string): Promise<never> => {
    await deleteObject(key).catch(() => {});
    throw new Error(msg);
  };
  if (!kind) return fail(`“${name}” isn't a supported file. Upload a ${FILE_TYPES_TEXT} file.`);
  const head = await headObject(key);
  if (!head) throw new Error("The upload didn't reach storage. Try again.");
  if (head.size > MAX_FILE_MB * 1024 * 1024) return fail(`“${name}” is larger than ${MAX_FILE_MB} MB.`);
  const first = await getObjectBytes(key, 16);
  if (!first || !looksLike(kind, first)) return fail(`“${name}” is not a real ${kind.label} file (it may be damaged or renamed).`);
  return { kind, size: head.size };
}

/** Makes an uploaded handout or manual the file of a content item. Live immediately. */
export async function attachUploadedFile(actor: Actor, contentId: string, key: string, name: string) {
  const item = await itemOrThrow(contentId);
  const { size } = await checkUploadedFile(key, name);
  const d = await db();
  const fileName = name.replace(/[^\w.-]/g, "_") || `${item.slug}.pdf`;
  await d.update(contentItems).set({ fileKey: key, fileName, fileBytes: size, mediaStatus: "ready" }).where(eq(contentItems.id, contentId));
  if (isUploadKey(item.fileKey) && item.fileKey !== key) await deleteObject(item.fileKey).catch(() => {});
  await audit(actor, "content.upload_file", contentId, { name: fileName, bytes: size });
}

/** Files studio: checks the upload first, then creates its content item (handout or kit manual). */
export async function createFileItemFromUpload(
  actor: Actor,
  input: { kitId: string | null; parentId: string | null; requiredTier: ContentInput["requiredTier"]; title: string; summary: string; type?: "pdf" | "manual" },
  key: string,
  name: string,
) {
  await checkUploadedFile(key, name);
  const type = input.type ?? "pdf";
  const row = await saveContent(actor, null, { ...input, type, parentId: type === "manual" ? null : input.parentId, section: null, minutes: null, ngss: [], bodyText: "", captionsText: "", labSlug: null });
  await attachUploadedFile(actor, row.id, key, name);
  return row;
}

/** Same as createFileItemFromUpload for a file already in memory (scripts and tests). */
export async function createFileItem(actor: Actor, input: Parameters<typeof createFileItemFromUpload>[1], file: File) {
  const key = newUploadKey("file", file.name);
  await putObject(key, Buffer.from(await file.arrayBuffer()), mimeFor(file.name));
  return createFileItemFromUpload(actor, input, key, file.name);
}

/** Replaces the file of an existing item from memory (scripts and tests). */
export async function uploadFile(actor: Actor, contentId: string, file: File) {
  const key = newUploadKey("file", file.name);
  await putObject(key, Buffer.from(await file.arrayBuffer()), mimeFor(file.name));
  await attachUploadedFile(actor, contentId, key, file.name);
}

/** Every handout and manual file, newest first, with its kit and the lesson it sits in. */
export async function fileLibrary() {
  const d = await db();
  const [allKits, items] = await Promise.all([d.select().from(kits).orderBy(kits.sortOrder), d.select().from(contentItems).orderBy(desc(contentItems.createdAt))]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const kitById = new Map(allKits.map((k) => [k.id, k]));
  const files = items
    .filter((i) => i.type === "pdf" || i.type === "manual")
    .map((f) => ({ ...f, kitName: f.kitId ? (kitById.get(f.kitId)?.name ?? null) : null, parentTitle: f.parentId ? (byId.get(f.parentId)?.title ?? null) : null }));
  const lessons = items.filter((i) => LESSON_TYPES.includes(i.type)).map((l) => ({ id: l.id, title: l.title, kitId: l.kitId }));
  return { kits: allKits, files, lessons };
}

// ---------- Video ----------

async function muxApi(p: string, init: RequestInit = {}) {
  const cfg = env.mux();
  if (!cfg?.tokenId || !cfg.tokenSecret) throw new Error("Mux API token not set");
  const r = await fetch(`https://api.mux.com${p}`, { ...init, headers: { Authorization: `Basic ${Buffer.from(`${cfg.tokenId}:${cfg.tokenSecret}`).toString("base64")}`, "Content-Type": "application/json" } });
  if (!r.ok) throw new Error(`Mux ${p} ${r.status}`);
  return ((await r.json()) as { data: Record<string, unknown> }).data;
}

export const muxUploadsEnabled = () => !!env.mux()?.tokenId && !!env.mux()?.tokenSecret;

/** A Mux direct-upload URL: the Studio browser sends the video straight to Mux (signed playback, adaptive streaming). */
export async function createMuxUpload(origin: string) {
  const up = await muxApi("/video/v1/uploads", { method: "POST", body: JSON.stringify({ cors_origin: origin, new_asset_settings: { playback_policy: ["signed"], mp4_support: "standard" } }) });
  return { url: String(up.url), uploadId: String(up.id) };
}

async function waitForMux(uploadId: string) {
  for (let i = 0; i < 280; i++) {
    const u = await muxApi(`/video/v1/uploads/${uploadId}`);
    if (u.status === "errored" || u.status === "cancelled") throw new Error("Mux could not receive the video");
    if (u.asset_id) {
      const a = await muxApi(`/video/v1/assets/${u.asset_id}`);
      if (a.status === "ready") return { playbackId: String((a.playback_ids as { id: string; policy: string }[]).find((p) => p.policy === "signed")?.id), duration: Math.round(Number(a.duration ?? 0)) };
      if (a.status === "errored") throw new Error("Mux could not process the video");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Mux processing timed out");
}

/**
 * Makes an uploaded video live. Mux: waits for Mux to process it (in the background). Cloud bucket without Mux:
 * the MP4 plays from the bucket with signed links, live at once. Local development: transcoded to HLS with ffmpeg.
 */
export async function attachUploadedVideo(actor: Actor, contentId: string, upload: { key?: string; muxUploadId?: string; name: string; durationSec?: number | null }) {
  const item = await itemOrThrow(contentId);
  const d = await db();
  const setReady = async (values: { videoAssetId: string }, duration: number | null) => {
    const fresh = (await d.select().from(contentItems).where(eq(contentItems.id, contentId)))[0];
    const captions = fresh?.captions?.length && duration ? rescale(fresh.captions, duration) : fresh?.captions;
    await d.update(contentItems).set({ ...values, videoDurationSec: duration, captions, mediaStatus: "ready" }).where(eq(contentItems.id, contentId));
    if (fresh?.videoAssetId?.startsWith("file:") && fresh.videoAssetId !== values.videoAssetId) await deleteObject(fresh.videoAssetId.slice(5)).catch(() => {});
  };
  const failed = async (e: unknown) => {
    console.error("video processing failed", e);
    await d.update(contentItems).set({ mediaStatus: "failed" }).where(eq(contentItems.id, contentId));
  };

  if (upload.muxUploadId) {
    await audit(actor, "content.upload_video", contentId, { name: upload.name, via: "mux" });
    await d.update(contentItems).set({ mediaStatus: "processing" }).where(eq(contentItems.id, contentId));
    const id = upload.muxUploadId;
    const work = (async () => {
      try {
        const m = await waitForMux(id);
        await setReady({ videoAssetId: `mux:${m.playbackId}` }, m.duration);
      } catch (e) {
        await failed(e);
      }
    })();
    return { status: "processing" as const, work };
  }

  const key = upload.key;
  if (!isUploadKey(key)) throw new Error("Upload not found. Try again.");
  const [head, first] = await Promise.all([headObject(key), getObjectBytes(key, 16)]);
  if (!head || !first) throw new Error("The upload didn't reach storage. Try again.");
  if (!isVideoName(upload.name) || !looksLikeVideo(first)) {
    await deleteObject(key).catch(() => {});
    throw new Error(`“${upload.name}” is not an MP4, MOV or WebM video.`);
  }
  await audit(actor, "content.upload_video", contentId, { name: upload.name, bytes: head.size });

  if (storageMode() === "s3") {
    await setReady({ videoAssetId: `file:${key}` }, upload.durationSec ? Math.round(upload.durationSec) : null);
    return { status: "ready" as const, work: null };
  }

  await d.update(contentItems).set({ mediaStatus: "processing" }).where(eq(contentItems.id, contentId));
  const src = path.join(MEDIA_DIR, key);
  const work = (async () => {
    try {
      await transcodeToHls(src, path.join(MEDIA_DIR, "videos", item.slug));
      await setReady({ videoAssetId: `local:${item.slug}` }, await probeSeconds(src));
    } catch (e) {
      await failed(e);
    }
  })();
  return { status: "processing" as const, work };
}

function rescale(cues: Cue[], duration: number) {
  const end = cues[cues.length - 1]?.end ?? 0;
  if (!end || Math.abs(end - duration) < 1) return cues;
  const k = duration / end;
  return cues.map((c) => ({ ...c, start: Math.round(c.start * k * 10) / 10, end: Math.round(c.end * k * 10) / 10 }));
}

// ---------- Interactive (HTML/JavaScript) lessons ----------

/** Unpacks an uploaded lesson package into its own versioned folder in storage, then switches the lesson to it. */
export async function attachUploadedPackage(actor: Actor, contentId: string, key: string, name: string) {
  const item = await itemOrThrow(contentId);
  if (!isUploadKey(key)) throw new Error("Upload not found. Try again.");
  if (!isPackageName(name)) {
    await deleteObject(key).catch(() => {});
    throw new Error(`“${name}” isn't a lesson package. Upload ${PACKAGE_TYPES_TEXT}.`);
  }
  const bytes = await getObjectBytes(key);
  if (!bytes) throw new Error("The upload didn't reach storage. Try again.");
  let unpacked: ReturnType<typeof unpackLesson>;
  try {
    unpacked = unpackLesson(bytes, name, item.title);
  } finally {
    await deleteObject(key).catch(() => {});
  }
  const prefix = `lessons/${item.slug}/${randomUUID().slice(0, 8)}`;
  const queue = [...unpacked.files];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) await putObject(`${prefix}/${f.path}`, f.data, packageMime(f.path));
    }),
  );
  const d = await db();
  await d.update(contentItems).set({ packageKey: prefix, packageEntry: unpacked.entry, fileName: name.replace(/[^\w.-]/g, "_"), fileBytes: bytes.length, mediaStatus: "ready" }).where(eq(contentItems.id, contentId));
  if (item.packageKey && item.packageKey !== prefix) await deletePrefix(item.packageKey).catch(() => {});
  await audit(actor, "content.upload_package", contentId, { name, files: unpacked.files.length, entry: unpacked.entry });
  return { files: unpacked.files.length, entry: unpacked.entry };
}

/** Same as attachUploadedPackage for a package already in memory (scripts and tests). */
export async function uploadPackage(actor: Actor, contentId: string, name: string, bytes: Uint8Array) {
  const key = newUploadKey("package", name);
  await putObject(key, bytes, "application/octet-stream");
  return attachUploadedPackage(actor, contentId, key, name);
}

/** Removes an item's stored files (upload, video, lesson package). Best effort: the database row is what gates access. */
async function deleteStoredMedia(item: typeof contentItems.$inferSelect) {
  if (isUploadKey(item.fileKey)) await deleteObject(item.fileKey).catch(() => {});
  if (item.videoAssetId?.startsWith("file:")) await deleteObject(item.videoAssetId.slice(5)).catch(() => {});
  if (item.packageKey) await deletePrefix(item.packageKey).catch(() => {});
}

// ---------- Lessons built in Studio's "Create a new lesson" panel ----------

export type LessonDetails = { title: string; summary: string; kitId: string | null; requiredTier: ContentInput["requiredTier"]; minutes: number | null; ngss: string[] };

/**
 * Updates only a lesson's details (never its body text, captions or files), and keeps its materials in the same kit
 * and access tier as the lesson.
 */
export async function updateLessonDetails(actor: Actor, id: string, input: LessonDetails) {
  const d = await db();
  const [version] = input.kitId ? await d.select().from(kitVersions).where(and(eq(kitVersions.kitId, input.kitId), eq(kitVersions.isCurrent, true))) : [];
  const shared = { kitId: input.kitId, kitVersionId: version?.id ?? null, requiredTier: input.requiredTier, isSample: input.requiredTier === "free" };
  await d.update(contentItems).set({ ...shared, title: input.title.trim(), summary: input.summary.trim(), minutes: input.minutes, ngss: input.ngss }).where(eq(contentItems.id, id));
  await d.update(contentItems).set(shared).where(eq(contentItems.parentId, id));
  await audit(actor, "content.update", id, { title: input.title.trim() });
}

/** Adds an empty material (video or document) to a lesson; the browser then uploads its file to it. */
export async function addLessonMaterial(actor: Actor, lessonId: string, input: { kind: MaterialKind; title: string; media: "video" | "file" }) {
  const lesson = await itemOrThrow(lessonId);
  const d = await db();
  const slug = await uniqueSlug(`${lesson.slug}-${input.title}`);
  const [row] = await d
    .insert(contentItems)
    .values({
      kitId: lesson.kitId,
      kitVersionId: lesson.kitVersionId,
      parentId: lesson.id,
      slug,
      type: input.media === "video" ? "video" : "pdf",
      title: input.title.trim() || MATERIAL[input.kind].label,
      summary: "",
      requiredTier: lesson.requiredTier,
      isSample: lesson.isSample,
      materialKind: input.kind,
      mediaStatus: "uploading",
      sortOrder: MATERIAL_KINDS.indexOf(input.kind) * 100 + (Math.floor(Date.now() / 1000) % 100),
    })
    .returning();
  await audit(actor, "content.add_material", row.id, { lesson: lesson.title, kind: input.kind });
  return row;
}

/** A top-level lesson (not an attached file), or null. */
export async function getContentForLesson(id: string) {
  const d = await db();
  const [row] = await d.select().from(contentItems).where(eq(contentItems.id, id));
  return row && !row.parentId && LESSON_TYPES.includes(row.type) ? row : null;
}

export async function renameContent(actor: Actor, id: string, title: string) {
  const d = await db();
  await d.update(contentItems).set({ title: title.trim() }).where(eq(contentItems.id, id));
  await audit(actor, "content.rename", id, { title: title.trim() });
}

/** Lessons (lesson, interactive lesson, training) with their attached materials, for the Studio Lessons page. */
export async function studioLessons() {
  const d = await db();
  const [allKits, items] = await Promise.all([d.select().from(kits).orderBy(kits.sortOrder), d.select().from(contentItems).orderBy(contentItems.sortOrder)]);
  const kids = new Map<string, (typeof items)[number][]>();
  for (const i of items) if (i.parentId) kids.set(i.parentId, [...(kids.get(i.parentId) ?? []), i]);
  const lessons = items
    .filter((i) => !i.parentId && LESSON_TYPES.includes(i.type))
    .map((l) => ({ ...l, materials: kids.get(l.id) ?? [] }));
  const other = items.filter((i) => !i.parentId && !LESSON_TYPES.includes(i.type));
  return { kits: allKits, lessons, other };
}

export async function studioContent() {
  const d = await db();
  const [allKits, items] = await Promise.all([d.select().from(kits).orderBy(kits.sortOrder), d.select().from(contentItems).orderBy(contentItems.sortOrder)]);
  return { kits: allKits, items };
}

export async function contentForEdit(id: string) {
  const d = await db();
  const [item] = await d.select().from(contentItems).where(eq(contentItems.id, id));
  if (!item) return null;
  const children = await d.select().from(contentItems).where(eq(contentItems.parentId, id));
  return { item, children };
}

export async function lessonsForParentSelect(kitId: string | null) {
  const d = await db();
  return d.select({ id: contentItems.id, title: contentItems.title }).from(contentItems).where(and(inArray(contentItems.type, LESSON_TYPES), kitId ? eq(contentItems.kitId, kitId) : undefined));
}
