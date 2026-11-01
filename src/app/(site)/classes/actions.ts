"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSchool } from "@/lib/auth/viewer";
import { ClassLimitError, createClass, deleteClass, newClassCode, ownedClass, removeStudent, setAssigned, updateClass } from "@/lib/classes";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (id: string, msg: string, kind: "ok" | "err" = "ok") => redirect(`/classes/${id}?${kind}=${encodeURIComponent(msg)}`);

export async function createClassAction(form: FormData) {
  const v = await requireSchool("/classes");
  const name = s(form, "name");
  if (name.length < 2) redirect("/classes?err=Name%20your%20class.");
  let id: string;
  try {
    id = (await createClass(v.teacher.id, v.org.id, name)).id;
  } catch (e) {
    if (e instanceof ClassLimitError) redirect(`/classes?err=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/classes/${id}?ok=${encodeURIComponent("Class created. Share the code with your students.")}`);
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
  back(c.id, s(form, "enabled") === "1" ? "Curie.AI is on for this class." : "Curie.AI is off for this class.");
}

export async function removeStudentAction(form: FormData) {
  const c = await mine(form);
  await removeStudent(c.id, s(form, "studentId"));
  back(c.id, "Student removed. Their seat is free again.");
}

export async function newCodeAction(form: FormData) {
  const c = await mine(form);
  const updated = await newClassCode(c.id);
  back(c.id, `New class code: ${updated.classCode}. Students already in the class stay in it.`);
}

export async function renameClassAction(form: FormData) {
  const c = await mine(form);
  const name = s(form, "name");
  if (name.length < 2) back(c.id, "Name your class.", "err");
  await updateClass(c.id, { name: name.slice(0, 60) });
  back(c.id, "Class renamed.");
}

export async function deleteClassAction(form: FormData) {
  const c = await mine(form);
  if (form.get("confirm") !== "on") back(c.id, "Tick the box to confirm.", "err");
  await deleteClass(c.id);
  redirect(`/classes?ok=${encodeURIComponent(`${c.name} was deleted.`)}`);
}
