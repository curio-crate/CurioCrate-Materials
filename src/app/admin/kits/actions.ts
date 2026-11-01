"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { KIT_KINDS, type KitKind } from "@/lib/kit-parts";
import { createKit, getStudioKit, updateKitIdentity } from "@/lib/kit-studio";

// Kits (Product Officers and Admins): create kits and keep what each one is.

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createKitAction(form: FormData) {
  const actor = await requireAdmin("kits");
  const kind = KIT_KINDS.find((k) => k === s(form, "kind")) as KitKind | undefined;
  const name = s(form, "name").slice(0, 120);
  const code = s(form, "code").toUpperCase();
  const fail = (err: string): never => redirect(`/admin/kits/new?${new URLSearchParams({ err, kind: kind ?? "", name, code, tagline: s(form, "tagline") })}`);
  if (!kind) fail("Choose whether this is an online or a physical kit.");
  if (name.length < 3) fail("Give the kit a name (at least 3 characters).");
  if (!/^[A-Z0-9]{3}$/.test(code)) fail("The code prefix is 3 letters or digits (e.g. MAG). It is printed on the kit's codes.");
  const gradeMin = Math.min(12, Math.max(1, Number(s(form, "gradeMin")) || 6));
  const gradeMax = Math.min(12, Math.max(gradeMin, Number(s(form, "gradeMax")) || gradeMin));
  const r = await createKit(actor, { kind: kind!, name, code, tagline: s(form, "tagline").slice(0, 200), gradeMin, gradeMax });
  if (!r.ok) fail(r.error);
  revalidatePath("/admin", "layout");
  const next = kind === "online" ? "Upload its HTML5 / JavaScript activities below." : "Curriculum can now add its parts, materials and lessons.";
  redirect(`/admin/kits/${(r as { id: string }).id}?ok=${encodeURIComponent(`Kit created and added to the Materials library as a draft. ${next}`)}`);
}

export async function saveKitIdentityAction(form: FormData) {
  const actor = await requireAdmin("kits");
  const id = s(form, "id");
  if (!(await getStudioKit(id))) redirect("/admin/kits");
  const name = s(form, "name").slice(0, 120);
  if (name.length < 3) redirect(`/admin/kits/${id}?err=${encodeURIComponent("Give the kit a name (at least 3 characters).")}`);
  await updateKitIdentity(actor, id, { name, tagline: s(form, "tagline").slice(0, 200), accent: ["lum", "gold", "blue"].includes(s(form, "accent")) ? s(form, "accent") : "blue" });
  revalidatePath("/", "layout");
  redirect(`/admin/kits/${id}?ok=${encodeURIComponent("Saved.")}`);
}
