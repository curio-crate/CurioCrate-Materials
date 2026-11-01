import type { NextRequest } from "next/server";
import { studioActor } from "@/lib/auth/viewer";
import { createMuxUpload, muxUploadsEnabled, newUploadKey, type UploadPurpose } from "@/lib/cms";
import { FILE_TYPES_TEXT, fileKind, isPackageName, isVideoName, MAX_FILE_MB, MAX_PACKAGE_MB, MAX_VIDEO_MB, mimeFor, PACKAGE_TYPES_TEXT, videoMime } from "@/lib/files";
import { json, sameOrigin } from "@/lib/http";
import { presignUpload } from "@/lib/storage";

const MB = 1024 * 1024;

// Step 1 of a Studio upload: checks the file's name and size, then returns where the browser sends it
// (a presigned PUT to the cloud bucket, or a Mux direct-upload URL for videos when Mux is set up).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (!(await studioActor("lessons"))) return json({ error: "Your Studio role can't upload." }, 403);
  const body = (await req.json().catch(() => ({}))) as { purpose?: UploadPurpose; name?: string; size?: number };
  const name = String(body.name ?? "").slice(0, 200);
  const size = Number(body.size ?? 0);
  if (!name || !size) return json({ error: "Choose a file to upload." }, 400);

  if (body.purpose === "file") {
    if (!fileKind(name)) return json({ error: `“${name}” isn't a supported file. Upload a ${FILE_TYPES_TEXT} file.` }, 400);
    if (size > MAX_FILE_MB * MB) return json({ error: `“${name}” is larger than ${MAX_FILE_MB} MB.` }, 400);
    const key = newUploadKey("file", name);
    return json({ provider: "storage", key, ...(await presignUpload(key, mimeFor(name))) });
  }
  if (body.purpose === "video") {
    if (!isVideoName(name)) return json({ error: "Upload an MP4, MOV or WebM video." }, 400);
    if (size > MAX_VIDEO_MB * MB) return json({ error: `Videos can be up to ${MAX_VIDEO_MB / 1000} GB.` }, 400);
    if (muxUploadsEnabled()) return json({ provider: "mux", ...(await createMuxUpload(req.nextUrl.origin)), headers: {} });
    const key = newUploadKey("video", name);
    return json({ provider: "storage", key, ...(await presignUpload(key, videoMime(name))) });
  }
  if (body.purpose === "package") {
    if (!isPackageName(name)) return json({ error: `Upload ${PACKAGE_TYPES_TEXT}.` }, 400);
    if (size > MAX_PACKAGE_MB * MB) return json({ error: `Lesson packages can be up to ${MAX_PACKAGE_MB} MB.` }, 400);
    const key = newUploadKey("package", name);
    return json({ provider: "storage", key, ...(await presignUpload(key, "application/octet-stream")) });
  }
  return json({ error: "Unknown upload type." }, 400);
}
