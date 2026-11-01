"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { clearReadNotifications, markNotificationsRead } from "@/lib/team/notify";

const safeLink = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/admin") && !s.startsWith("//") ? s : "/admin/inbox";
};

/** Opens a notification: marks it read and goes to what it is about. */
export async function openNotificationAction(form: FormData) {
  const actor = await requireAdmin();
  await markNotificationsRead(actor.adminId, [String(form.get("id") ?? "")]);
  revalidatePath("/admin", "layout");
  redirect(safeLink(form.get("link")));
}

export async function markAllReadAction() {
  const actor = await requireAdmin();
  await markNotificationsRead(actor.adminId);
  revalidatePath("/admin", "layout");
  redirect("/admin/inbox");
}

export async function clearReadAction() {
  const actor = await requireAdmin();
  await clearReadNotifications(actor.adminId);
  redirect("/admin/inbox");
}
