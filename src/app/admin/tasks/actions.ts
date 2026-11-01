"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { assignTask, completeTask, removeTask, reopenTask } from "@/lib/team/tasks";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function back(r: { ok: boolean; error?: string }, ok: string, f: FormData): never {
  revalidatePath("/admin", "layout");
  const d = s(f, "d");
  const qs = new URLSearchParams({ ...(d ? { d } : {}), [r.ok ? "ok" : "err"]: r.ok ? ok : (r.error ?? "Something went wrong.") });
  redirect(`/admin/tasks?${qs}`);
}

export async function assignTaskAction(form: FormData) {
  const actor = await requireAdmin();
  const r = await assignTask(actor, { title: s(form, "title"), notes: s(form, "notes"), assigneeId: s(form, "assignee"), dueAt: new Date(s(form, "due")) });
  back(r, r.ok ? `To-do given to ${r.assignee}. They've been notified.` : "", form);
}

export async function completeTaskAction(form: FormData) {
  const actor = await requireAdmin();
  back(await completeTask(actor, s(form, "id")), "Marked done. Whoever gave it has been notified.", form);
}

export async function reopenTaskAction(form: FormData) {
  const actor = await requireAdmin();
  back(await reopenTask(actor, s(form, "id")), "Reopened.", form);
}

export async function removeTaskAction(form: FormData) {
  const actor = await requireAdmin();
  back(await removeTask(actor, s(form, "id")), "To-do deleted.", form);
}
