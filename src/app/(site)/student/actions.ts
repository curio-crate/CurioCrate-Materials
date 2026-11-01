"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { signToken, verifyToken } from "@/lib/crypto";
import { AGE_GATE_COOKIE, ageCheck, createStudentAccount, currentLearner, deleteStudentAccount, LEARNER_COOKIE, learnerCookieOptions, studentSignIn } from "@/lib/students";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const AGE_AUDIENCE = "student-age";

/**
 * Step 1, the age screen. Neutral (it doesn't say which answer is "right"). Under 13: nothing is stored, a cookie
 * keeps the form closed for a day, and the student is pointed to a class code instead.
 */
export async function ageAction(_: FormState, form: FormData): Promise<FormState> {
  const year = Number(s(form, "year"));
  const month = Number(s(form, "month"));
  const r = ageCheck(year, month);
  if (r === "invalid") return { error: "Choose your birth month and year." };
  if (r === "under") {
    (await cookies()).set(AGE_GATE_COOKIE, "under", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400, secure: process.env.NODE_ENV === "production" && !process.env.E2E });
    redirect("/student/signup");
  }
  redirect(`/student/signup?age=${encodeURIComponent(await signToken({ y: year, m: month }, 1800, AGE_AUDIENCE))}`);
}

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  if ((await cookies()).get(AGE_GATE_COOKIE)) redirect("/student/signup");
  const age = await verifyToken<{ y: number; m: number }>(s(form, "age"), AGE_AUDIENCE);
  if (!age) return { error: "That took a while. Please start again from the age question." };
  const r = await createStudentAccount({
    email: s(form, "email"),
    password: String(form.get("password") ?? ""),
    nickname: s(form, "nickname"),
    birthYear: age.y,
    birthMonth: age.m,
    agree: form.get("agree") === "on",
  });
  if (!r.ok) return { error: r.error };
  (await cookies()).set(LEARNER_COOKIE, r.token, learnerCookieOptions());
  redirect("/student?welcome=1");
}

export async function signinAction(_: FormState, form: FormData): Promise<FormState> {
  const r = await studentSignIn(s(form, "email"), String(form.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  (await cookies()).set(LEARNER_COOKIE, r.token, learnerCookieOptions());
  redirect("/student");
}

export async function deleteAccountAction(form: FormData) {
  const me = await currentLearner();
  if (!me) redirect("/student/signin");
  if (form.get("confirm") !== "on") redirect("/student?err=" + encodeURIComponent("Tick the box to confirm."));
  await deleteStudentAccount(me.id);
  (await cookies()).delete(LEARNER_COOKIE);
  redirect("/?deleted=1");
}
