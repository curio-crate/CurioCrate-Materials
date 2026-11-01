"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/viewer";
import { addLessonMaterial, deleteContent, getContentForLesson, renameContent, updateLessonDetails, type LessonDetails } from "@/lib/cms";
import { asMaterialKind } from "@/lib/materials";

// Used by the "Create a new lesson" panel. Each returns a result (no redirect) so the panel can keep going and show
// progress per file. Curriculum, Product Officers and Admins all have the "lessons" permission.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const TIERS = ["free", "kit_owner", "subscription"] as const;

function clean(d: LessonDetails): LessonDetails | string {
  if ((d.title ?? "").trim().length < 3) return "Give the lesson a title (at least 3 characters).";
  return {
    title: d.title.trim().slice(0, 160),
    summary: (d.summary ?? "").trim().slice(0, 600),
    kitId: d.kitId || null,
    requiredTier: TIERS.find((t) => t === d.requiredTier) ?? "kit_owner",
    minutes: Number(d.minutes) > 0 ? Math.min(600, Math.round(Number(d.minutes))) : null,
    ngss: (d.ngss ?? []).map((c) => String(c).trim().toUpperCase()).filter(Boolean).slice(0, 20),
  };
}

const live = () => revalidatePath("/", "layout");

export async function saveLessonDetailsAction(id: string, details: LessonDetails): Promise<Result> {
  const actor = await requireAdmin("lessons");
  const d = clean(details);
  if (typeof d === "string") return { ok: false, error: d };
  if (!(await getContentForLesson(id))) return { ok: false, error: "That lesson no longer exists." };
  await updateLessonDetails(actor, id, d);
  live();
  return { ok: true };
}

export async function addMaterialAction(lessonId: string, input: { kind: string; title: string; media: "video" | "file" }): Promise<Result<{ id: string }>> {
  const actor = await requireAdmin("lessons");
  const kind = asMaterialKind(input.kind);
  if (!kind) return { ok: false, error: "Unknown material type." };
  if (!(await getContentForLesson(lessonId))) return { ok: false, error: "Save the lesson first." };
  const row = await addLessonMaterial(actor, lessonId, { kind, title: String(input.title ?? "").slice(0, 160), media: input.media === "video" ? "video" : "file" });
  return { ok: true, id: row.id };
}

export async function renameMaterialAction(id: string, title: string): Promise<Result> {
  const actor = await requireAdmin("lessons");
  if (!title.trim()) return { ok: false, error: "Add a title." };
  await renameContent(actor, id, title.slice(0, 160));
  live();
  return { ok: true };
}

export async function removeContentAction(id: string): Promise<Result> {
  const actor = await requireAdmin("lessons");
  await deleteContent(actor, id);
  live();
  return { ok: true };
}
