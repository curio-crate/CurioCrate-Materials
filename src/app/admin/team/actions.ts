"use server";

import { redirect } from "next/navigation";
import { changeOwnPassword, createAdmin, getCompanyAdmin, resetAdminPassword, setAdminActive, setAdminRole } from "@/lib/auth/admin";
import { can } from "@/lib/auth/roles";

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

async function me() {
  const a = await getCompanyAdmin();
  if (!a) redirect("/company/login");
  return a;
}

/** Adding people, roles, disabling and password resets: admins only. */
async function admin() {
  const a = await me();
  if (!can(a.role, "team")) redirect("/admin?denied=1");
  return a;
}

function back(r: { ok: boolean; error?: string }, ok: string, path = "/admin/team"): never {
  redirect(`${path}?${r.ok ? "ok" : "err"}=${encodeURIComponent(r.ok ? ok : (r.error ?? "Something went wrong."))}`);
}

export async function createAdminAction(form: FormData) {
  const r = await createAdmin(await admin(), { email: str(form, "email"), name: str(form, "name"), role: str(form, "role"), password: str(form, "password") });
  back(r, `Added ${str(form, "email").trim()}. Share the temporary password with them privately; they sign in with their email.`);
}

export async function setRoleAction(form: FormData) {
  const r = await setAdminRole(await admin(), str(form, "id"), str(form, "role"));
  back(r, `Role changed${"label" in r ? ` to ${r.label}` : ""}. It applies on their next click.`);
}

export async function setActiveAction(form: FormData) {
  const active = str(form, "active") === "1";
  back(await setAdminActive(await admin(), str(form, "id"), active), active ? "Account enabled." : "Account disabled and signed out everywhere.");
}

export async function resetPasswordAction(form: FormData) {
  back(await resetAdminPassword(await admin(), str(form, "id"), str(form, "password")), "Password reset. That account was signed out everywhere.");
}

export async function changeOwnPasswordAction(form: FormData) {
  if (str(form, "next") !== str(form, "confirm")) back({ ok: false, error: "The new passwords don't match." }, "", "/admin/account");
  back(await changeOwnPassword(await me(), str(form, "current"), str(form, "next")), "Password changed. Your other sessions were signed out.", "/admin/account");
}
