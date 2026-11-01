"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { safeNext } from "@/lib/auth/flow";
import { getViewer } from "@/lib/auth/viewer";
import { acceptTeacherTerms, createSchoolForTeacher, joinSchoolWithCode } from "@/lib/teachers";

const TERMS_ERROR = { error: "Please agree to the Terms of Use and Privacy Policy." };

export async function createSchoolAction(_: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) redirect("/signin");
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3) return { error: "Enter your school's full name." };
  if (form.get("agree") !== "on") return TERMS_ERROR;
  await createSchoolForTeacher(v.teacher.id, {
    name,
    city: String(form.get("city") ?? ""),
    state: String(form.get("state") ?? ""),
    claimDomain: form.get("claimDomain") === "on",
  });
  await acceptTeacherTerms(v.teacher.id);
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function joinSchoolAction(_: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) redirect("/signin");
  if (form.get("agree") !== "on") return TERMS_ERROR;
  const r = await joinSchoolWithCode(v.teacher.id, String(form.get("code") ?? ""));
  if (!r.ok) return { error: r.error };
  await acceptTeacherTerms(v.teacher.id);
  redirect(safeNext(String(form.get("next") ?? "")));
}
