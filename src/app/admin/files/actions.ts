"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { cleanParts } from "@/lib/kit-parts";
import { getStudioKit, replaceKitParts, setKitPublished, updateKitProfile } from "@/lib/kit-studio";
import { trashContent } from "@/lib/team/trash";

// Materials library (Curriculum, Product Officers, Admins): each kit's profile.

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
const live = () => revalidatePath("/", "layout");

function back(kit: string, tab: string, msg: { ok?: string; err?: string }): never {
  const qs = new URLSearchParams({ ...(tab ? { tab } : {}), ...msg } as Record<string, string>);
  redirect(`/admin/files/${kit || "general"}?${qs}`);
}

export async function deleteFileAction(form: FormData) {
  const actor = await requireAdmin("library");
  const r = await trashContent(actor, s(form, "id"));
  live();
  back(s(form, "kit"), s(form, "tab"), r.ok ? { ok: `Moved “${r.title}” to Recently deleted. Teachers no longer see it; an admin can restore it for 30 days.` } : { err: r.error });
}

export async function saveKitProfileAction(form: FormData) {
  const actor = await requireAdmin("library");
  const id = s(form, "id");
  if (!(await getStudioKit(id))) redirect("/admin/files");
  const gradeMin = Math.min(12, Math.max(1, Number(s(form, "gradeMin")) || 6));
  const gradeMax = Math.min(12, Math.max(gradeMin, Number(s(form, "gradeMax")) || gradeMin));
  await updateKitProfile(actor, id, {
    gradeMin,
    gradeMax,
    description: s(form, "description").slice(0, 2000),
    ngss: list(s(form, "ngss")).map((c) => c.toUpperCase()).slice(0, 30),
    skills: list(s(form, "skills")).slice(0, 30),
  });
  live();
  back(id, "", { ok: "Details saved." });
}

export async function publishKitAction(form: FormData) {
  const actor = await requireAdmin("library");
  const id = s(form, "id");
  const kit = await getStudioKit(id);
  if (!kit) redirect("/admin/files");
  const publish = s(form, "publish") === "1";
  await setKitPublished(actor, id, publish);
  live();
  back(id, s(form, "tab"), { ok: publish ? `${kit.name} is published. Teachers can see it in the catalog now.` : `${kit.name} is a draft again. Teachers no longer see it.` });
}

/** Saves the whole parts list at once (called by the parts editor). */
export async function saveKitPartsAction(kitId: string, rows: unknown): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const actor = await requireAdmin("library");
  const kit = await getStudioKit(kitId);
  if (!kit) return { ok: false, error: "That kit no longer exists." };
  if (kit.kind === "online") return { ok: false, error: "Online kits have no physical parts." };
  const parts = cleanParts(rows);
  await replaceKitParts(actor, kitId, parts);
  live();
  return { ok: true, count: parts.length };
}
