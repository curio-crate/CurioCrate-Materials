"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { deleteContent, saveContent, saveKit, type ContentInput } from "@/lib/cms";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

export async function saveContentAction(form: FormData) {
  const actor = await requireAdmin("lessons");
  const id = s(form, "id") || null;
  const type = s(form, "type") as ContentInput["type"];
  if (s(form, "title").length < 3) redirect(`${id ? `/admin/content/${id}` : "/admin/content/new"}?err=${encodeURIComponent("Add a title.")}`);
  const row = await saveContent(actor, id, {
    kitId: s(form, "kitId") || null,
    parentId: s(form, "parentId") || null,
    type,
    title: s(form, "title"),
    summary: s(form, "summary"),
    requiredTier: (s(form, "tier") || "kit_owner") as ContentInput["requiredTier"],
    section: s(form, "section") || null,
    minutes: Number(s(form, "minutes")) || null,
    ngss: list(s(form, "ngss")).map((c) => c.toUpperCase()),
    bodyText: String(form.get("body") ?? ""),
    captionsText: String(form.get("captions") ?? ""),
    labSlug: s(form, "labSlug") || null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/content/${row.id}?ok=${encodeURIComponent(id ? "Saved. Changes are live." : "Created. It is live in the catalog now.")}`);
}

export async function deleteContentAction(form: FormData) {
  const actor = await requireAdmin("lessons");
  await deleteContent(actor, s(form, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/content?ok=Deleted.");
}

export async function saveKitAction(form: FormData) {
  const actor = await requireAdmin("kits");
  const id = s(form, "id") || null;
  const name = s(form, "name");
  const code = s(form, "code").toUpperCase();
  if (name.length < 3 || !/^[A-Z0-9]{3}$/.test(code)) redirect(`/admin/kits/${id ?? "new"}?err=${encodeURIComponent("Add a name and a 3-character code prefix (e.g. MAG).")}`);
  const gradeMin = Number(s(form, "gradeMin")) || 4;
  const gradeMax = Number(s(form, "gradeMax")) || gradeMin;
  const kitId = await saveKit(actor, id, {
    name, code, gradeMin, gradeMax, gradeBand: `Grades ${gradeMin}–${gradeMax}`,
    tagline: s(form, "tagline"), description: s(form, "description"), status: s(form, "status") || "available", accent: s(form, "accent") || "blue",
    ngss: list(s(form, "ngss")).map((c) => c.toUpperCase()), skills: list(s(form, "skills")), inTheBox: list(s(form, "inTheBox")),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/kits/${kitId}?ok=${encodeURIComponent("Kit saved. It appears in the catalog and in Orders & codes.")}`);
}
