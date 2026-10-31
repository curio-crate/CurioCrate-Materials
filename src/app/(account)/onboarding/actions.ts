"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { safeNext } from "@/lib/auth/flow";
import { getViewer } from "@/lib/auth/viewer";
import { createSchoolForTeacher, joinSchoolWithCode } from "@/lib/teachers";

export async function createSchoolAction(_: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) redirect("/signin");
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3) return { error: "Enter your school's full name." };
  await createSchoolForTeacher(v.teacher.id, {
    name,
    city: String(form.get("city") ?? ""),
    state: String(form.get("state") ?? ""),
    claimDomain: form.get("claimDomain") === "on",
  });
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function joinSchoolAction(_: FormState, form: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) redirect("/signin");
  const r = await joinSchoolWithCode(v.teacher.id, String(form.get("code") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect(safeNext(String(form.get("next") ?? "")));
}
