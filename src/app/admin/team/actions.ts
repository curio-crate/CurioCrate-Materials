"use server";

import { redirect } from "next/navigation";
import { changeOwnPassword, createAdmin, getCompanyAdmin, resetAdminPassword, setAdminActive } from "@/lib/auth/admin";

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

async function me() {
  const a = await getCompanyAdmin();
  if (!a) redirect("/company/login");
  return a;
}

function back(r: { ok: boolean; error?: string }, ok: string): never {
  redirect(`/admin/team?${r.ok ? "ok" : "err"}=${encodeURIComponent(r.ok ? ok : (r.error ?? "Something went wrong."))}`);
}

export async function createAdminAction(form: FormData) {
  const r = await createAdmin(await me(), { username: str(form, "username"), name: str(form, "name"), password: str(form, "password") });
  back(r, `Added ${str(form, "username").trim()}. Share the password with them privately; they can change it under Team.`);
}

export async function setActiveAction(form: FormData) {
  const active = str(form, "active") === "1";
  back(await setAdminActive(await me(), str(form, "id"), active), active ? "Account enabled." : "Account disabled and signed out everywhere.");
}

export async function resetPasswordAction(form: FormData) {
  back(await resetAdminPassword(await me(), str(form, "id"), str(form, "password")), "Password reset. That account was signed out everywhere.");
}

export async function changeOwnPasswordAction(form: FormData) {
  if (str(form, "next") !== str(form, "confirm")) back({ ok: false, error: "The new passwords don't match." }, "");
  back(await changeOwnPassword(await me(), str(form, "current"), str(form, "next")), "Password changed. Your other sessions were signed out.");
}
