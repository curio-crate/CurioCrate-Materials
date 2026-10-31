"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSchool } from "@/lib/auth/viewer";
import { createClass, ownedClass, setAssigned, updateClass } from "@/lib/classes";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createClassAction(form: FormData) {
  const v = await requireSchool("/classes");
  const name = s(form, "name");
  if (name.length < 2) redirect("/classes?err=Name%20your%20class.");
  const c = await createClass(v.teacher.id, v.org.id, name);
  redirect(`/classes/${c.id}?ok=${encodeURIComponent("Class created. Share the code with students.")}`);
}

async function mine(form: FormData) {
  const v = await requireSchool("/classes");
  const c = await ownedClass(s(form, "classId"), v.teacher.id);
  if (!c) redirect("/classes");
  return c;
}

export async function assignAction(form: FormData) {
  const c = await mine(form);
  await setAssigned(c.id, s(form, "contentId"), s(form, "on") === "1");
  revalidatePath(`/classes/${c.id}`);
}

export async function curieAction(form: FormData) {
  const c = await mine(form);
  const limit = Math.max(10, Math.min(2000, Number(s(form, "limit")) || c.curieDailyLimit));
  await updateClass(c.id, { curieEnabled: s(form, "enabled") === "1", curieDailyLimit: limit });
  redirect(`/classes/${c.id}?ok=${encodeURIComponent(s(form, "enabled") === "1" ? "Curie.AI is on for this class." : "Curie.AI is off for this class.")}`);
}
