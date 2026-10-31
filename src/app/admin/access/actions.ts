"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroyAllSessions } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/viewer";
import { restoreEntitlement, revokeEntitlement } from "@/lib/entitlements";
import { grantSeat, setContentTier, transferSeat } from "@/lib/security";
import { decideMembership } from "@/lib/teachers";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const TIERS = ["free", "kit_owner", "subscription"] as const;

function back(f: FormData, msg: string, ok = true): never {
  const email = str(f, "email");
  const qs = new URLSearchParams({ [ok ? "ok" : "err"]: msg, ...(email ? { email } : {}) });
  redirect(`/admin/access?${qs}${str(f, "anchor") ? `#${str(f, "anchor")}` : ""}`);
}

export async function grantSeatAction(f: FormData) {
  const a = await requireAdmin();
  const r = await grantSeat(a, str(f, "teacherId"), str(f, "kitId"), str(f, "reason") || "granted in Studio");
  back(f, r.ok ? "Kit added to this teacher's account." : r.error, r.ok);
}

export async function revokeSeatAction(f: FormData) {
  const a = await requireAdmin();
  await revokeEntitlement(a, str(f, "entitlementId"), str(f, "reason") || "revoked in Studio");
  back(f, "Access revoked.");
}

export async function restoreSeatAction(f: FormData) {
  const a = await requireAdmin();
  await restoreEntitlement(a, str(f, "entitlementId"));
  back(f, "Access restored.");
}

export async function transferSeatAction(f: FormData) {
  const a = await requireAdmin();
  const r = await transferSeat(a, str(f, "entitlementId"), str(f, "to"));
  back(f, r.ok ? `Seat moved to ${r.email}.` : r.error, r.ok);
}

export async function signOutEverywhereAction(f: FormData) {
  await requireAdmin();
  await destroyAllSessions(str(f, "teacherId"));
  back(f, "Signed out on every device.");
}

export async function membershipAction(f: FormData) {
  const a = await requireAdmin();
  const approve = str(f, "approve") === "1";
  const t = await decideMembership({ ...a, orgId: null }, str(f, "teacherId"), approve);
  back(f, t ? (approve ? `${t.email} approved.` : `${t.email} removed from the school.`) : "Teacher not found.", !!t);
}

export async function setTierAction(f: FormData) {
  const a = await requireAdmin();
  const tier = TIERS.find((t) => t === str(f, "tier"));
  if (!tier) back(f, "Choose who can open it.", false);
  await setContentTier(a, str(f, "contentId"), tier);
  revalidatePath("/", "layout");
  back(f, `Access for “${str(f, "title")}” saved. It applies right away.`);
}
