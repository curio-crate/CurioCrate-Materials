"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { deleteContent } from "@/lib/cms";

export async function deleteFileAction(form: FormData) {
  const actor = await requireAdmin("library");
  await deleteContent(actor, String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
  const qs = new URLSearchParams({ ok: `Deleted “${String(form.get("title") ?? "file")}”. Teachers no longer see it.` });
  const kit = String(form.get("kit") ?? "");
  if (kit) qs.set("kit", kit);
  redirect(`/admin/files?${qs}`);
}
