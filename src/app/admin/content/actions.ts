"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { saveContent, type ContentInput } from "@/lib/cms";
import { trashContent } from "@/lib/team/trash";

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
  const r = await trashContent(actor, s(form, "id"));
  revalidatePath("/", "layout");
  redirect(`/admin/content?${r.ok ? `ok=${encodeURIComponent(`Moved “${r.title}” to Recently deleted. An admin can restore it for 30 days.`)}` : `err=${encodeURIComponent(r.error)}`}`);
}
