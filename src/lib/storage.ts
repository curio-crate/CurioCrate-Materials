import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs/promises";
import path from "node:path";
import { contentBySlug } from "@/content/lessons";
import { hmac, safeEqual } from "./crypto";
import { cloudRequired, env } from "./env";
import { mimeFor } from "./files";
import { renderPdf } from "./pdf";

// File storage for everything the team uploads (handouts, manuals, videos without Mux, interactive lessons).
// Cloud: an S3-compatible bucket (Cloudflare R2 recommended). Browsers upload straight to the bucket with
// presigned PUT links (so file size isn't limited by the web server) and download with short-lived presigned GETs.
// Local stand-in (development only): files under .media/ behind HMAC-signed, expiring links.
// A deployed production site refuses the local stand-in (see cloudRequired) so no upload is ever lost.

export const MEDIA_DIR = path.join(process.cwd(), ".media");

let s3Client: S3Client | null = null;
function s3() {
  const cfg = env.s3();
  if (!cfg) {
    if (cloudRequired()) throw new Error("Cloud file storage is not configured. Set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
    return null;
  }
  s3Client ??= new S3Client({ region: cfg.region, endpoint: cfg.endpoint, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }, forcePathStyle: !!cfg.endpoint });
  return { client: s3Client, bucket: cfg.bucket };
}

export function storageMode() {
  return env.s3() ? "s3" : "local";
}

const localPath = (key: string) => {
  const full = path.join(MEDIA_DIR, key);
  if (!full.startsWith(MEDIA_DIR + path.sep)) throw new Error("bad storage key");
  return full;
};

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  const remote = s3();
  if (remote) {
    await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
}

/** Size of a stored object, or null if it doesn't exist. */
export async function headObject(key: string): Promise<{ size: number } | null> {
  const remote = s3();
  try {
    if (remote) {
      const r = await remote.client.send(new HeadObjectCommand({ Bucket: remote.bucket, Key: key }));
      return { size: Number(r.ContentLength ?? 0) };
    }
    return { size: (await fs.stat(localPath(key))).size };
  } catch {
    return null;
  }
}

/** Reads a stored object (or its first `firstBytes` bytes). */
export async function getObjectBytes(key: string, firstBytes?: number): Promise<Buffer | null> {
  const remote = s3();
  try {
    if (remote) {
      const r = await remote.client.send(new GetObjectCommand({ Bucket: remote.bucket, Key: key, Range: firstBytes ? `bytes=0-${firstBytes - 1}` : undefined }));
      return Buffer.from(await r.Body!.transformToByteArray());
    }
    const bytes = await fs.readFile(localPath(key));
    return firstBytes ? bytes.subarray(0, firstBytes) : bytes;
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  await deletePrefix(key, true);
}

/** Deletes one object, or every object under a prefix (e.g. an old version of an interactive lesson). */
export async function deletePrefix(prefix: string, exact = false) {
  const remote = s3();
  if (remote) {
    if (exact) {
      await remote.client.send(new DeleteObjectsCommand({ Bucket: remote.bucket, Delete: { Objects: [{ Key: prefix }] } }));
      return;
    }
    let token: string | undefined;
    do {
      const page = await remote.client.send(new ListObjectsV2Command({ Bucket: remote.bucket, Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`, ContinuationToken: token }));
      const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (keys.length) await remote.client.send(new DeleteObjectsCommand({ Bucket: remote.bucket, Delete: { Objects: keys } }));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return;
  }
  await fs.rm(localPath(prefix), { recursive: true, force: true }).catch(() => {});
}

// ---------- Direct uploads (browser → storage) ----------

const putSig = (key: string, exp: number) => hmac(`put:${key}:${exp}`);

/** A presigned PUT the Studio browser uploads one file to. Only issued to signed-in Studio accounts. */
export async function presignUpload(key: string, contentType: string) {
  const remote = s3();
  if (remote) {
    const url = await getSignedUrl(remote.client, new PutObjectCommand({ Bucket: remote.bucket, Key: key, ContentType: contentType }), { expiresIn: 3600 });
    return { url, headers: { "Content-Type": contentType } };
  }
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return { url: `/api/admin/uploads/local?${new URLSearchParams({ key, exp: String(exp), sig: putSig(key, exp) })}`, headers: { "Content-Type": contentType } };
}

export function verifyLocalUpload(key: string | null, exp: string | null, sig: string | null) {
  if (!key || !exp || !sig || storageMode() !== "local") return false;
  const e = Number(exp);
  return Number.isFinite(e) && e > Date.now() / 1000 && safeEqual(sig, putSig(key, e));
}

// ---------- Downloads ----------

const fileSig = (key: string, exp: number) => hmac(`file:${key}:${exp}`);

/** A short-lived link to a stored file. Callers must check access first. `inline` is for video playback. */
export async function signedFileUrl(key: string, downloadName: string, opts: { inline?: boolean; ttlSec?: number } = {}) {
  const ttl = opts.ttlSec ?? env.fileUrlTtlSec();
  const safeName = downloadName.replace(/[^\w.-]/g, "_");
  const remote = s3();
  if (remote) {
    return getSignedUrl(
      remote.client,
      new GetObjectCommand({ Bucket: remote.bucket, Key: key, ResponseContentDisposition: `${opts.inline ? "inline" : "attachment"}; filename="${safeName}"`, ResponseContentType: mimeFor(key) }),
      { expiresIn: ttl },
    );
  }
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const qs = new URLSearchParams({ exp: String(exp), sig: fileSig(key, exp), name: safeName, ...(opts.inline ? { inline: "1" } : {}) });
  return `/api/media/file/${key}?${qs}`;
}

export function verifyLocalFileSignature(key: string, exp: string | null, sig: string | null) {
  if (!exp || !sig) return false;
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Date.now() / 1000) return false;
  return safeEqual(sig, fileSig(key, e));
}

/** Reads a local file; seeded PDFs that were never generated are rendered on demand from the content definition. */
export async function readLocalFile(key: string) {
  let full: string;
  try {
    full = localPath(key);
  } catch {
    return null;
  }
  try {
    return await fs.readFile(full);
  } catch {
    const m = /^files\/([a-z0-9-]+)\.pdf$/.exec(key);
    const spec = m ? contentBySlug(m[1]) : null;
    if (!spec?.pdf) return null;
    const bytes = Buffer.from(await renderPdf(spec.pdf, { title: spec.title, slug: spec.slug }));
    await fs.mkdir(path.dirname(full), { recursive: true }).catch(() => {});
    await fs.writeFile(full, bytes).catch(() => {});
    return bytes;
  }
}
