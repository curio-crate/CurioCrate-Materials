import { revalidatePath } from "next/cache";
import { after, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/viewer";
import { attachUploadedFile, attachUploadedPackage, attachUploadedVideo, createFileItemFromUpload, deleteContent, saveContent, type ContentInput } from "@/lib/cms";
import { titleFromFileName } from "@/lib/files";
import { json, sameOrigin } from "@/lib/http";

export const maxDuration = 300;

const TIERS = ["free", "kit_owner", "subscription"] as const;

type Body = {
  purpose?: "file" | "video" | "package";
  key?: string;
  muxUploadId?: string;
  name?: string;
  durationSec?: number;
  contentId?: string;
  // Files studio / bulk lesson upload: create the item from the upload
  create?: { kitId?: string; parentId?: string; tier?: string; title?: string; summary?: string; type?: "pdf" | "manual" };
};

// Step 2 of a Studio upload, after the browser has sent the file to storage: checks the stored bytes and makes it
// live (handout/manual file, video, or an interactive HTML/JS lesson package).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const actor = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Body;
  const name = String(b.name ?? "").slice(0, 200);
  const key = String(b.key ?? "");
  const tier = TIERS.find((t) => t === b.create?.tier) ?? "kit_owner";
  const done = (body: Record<string, unknown>) => {
    revalidatePath("/", "layout");
    return json({ ok: true, ...body });
  };
  try {
    if (b.purpose === "file") {
      if (b.contentId) {
        await attachUploadedFile(actor, b.contentId, key, name);
        return done({ status: "ready", id: b.contentId });
      }
      const c = b.create ?? {};
      const row = await createFileItemFromUpload(actor, { kitId: c.kitId || null, parentId: c.parentId || null, requiredTier: tier, title: c.title?.trim() || titleFromFileName(name) || "Handout", summary: c.summary?.trim() ?? "", type: c.type === "manual" ? "manual" : "pdf" }, key, name);
      return done({ status: "ready", id: row.id, slug: row.slug });
    }
    if (b.purpose === "video") {
      if (!b.contentId) return json({ error: "Save the video item first." }, 400);
      const r = await attachUploadedVideo(actor, b.contentId, { key: key || undefined, muxUploadId: b.muxUploadId, name, durationSec: Number(b.durationSec) || null });
      if (r.work) after(r.work);
      return done({ status: r.status, id: b.contentId });
    }
    if (b.purpose === "package") {
      let id = b.contentId;
      let created = false;
      if (!id) {
        const c = b.create ?? {};
        const input: ContentInput = { kitId: c.kitId || null, parentId: null, type: "interactive", title: c.title?.trim() || titleFromFileName(name) || "Interactive lesson", summary: c.summary?.trim() ?? "", requiredTier: tier, section: null, minutes: null, ngss: [], bodyText: "", captionsText: "", labSlug: null };
        id = (await saveContent(actor, null, input)).id;
        created = true;
      }
      try {
        const r = await attachUploadedPackage(actor, id, key, name);
        return done({ status: "ready", id, ...r });
      } catch (e) {
        if (created) await deleteContent(actor, id);
        throw e;
      }
    }
    return json({ error: "Unknown upload type." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
}
