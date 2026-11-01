"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { purgeTrash, restoreTrash } from "@/lib/team/trash";

// Recently deleted: admins only (the "trash" permission).

function back(r: { ok: boolean; error?: string }, ok: string): never {
  revalidatePath("/", "layout");
  redirect(`/admin/trash?${r.ok ? "ok" : "err"}=${encodeURIComponent(r.ok ? ok : (r.error ?? "Something went wrong."))}`);
}

export async function restoreAction(form: FormData) {
  const actor = await requireAdmin("trash");
  const r = await restoreTrash(actor, String(form.get("id") ?? ""));
  back(r, `Restored “${r.ok ? r.title : ""}”. It's back where it was.`);
}

export async function purgeAction(form: FormData) {
  const actor = await requireAdmin("trash");
  const r = await purgeTrash(actor, String(form.get("id") ?? ""));
  back(r, `Deleted “${r.ok ? r.title : ""}” for good.`);
}
