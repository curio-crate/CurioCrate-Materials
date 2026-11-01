"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kits, organizations } from "@/db/schema";
import { createOrg, moveTeacher, setEmailDomain, setParent } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/viewer";
import { grantKitAccess, restoreEntitlement, revokeEntitlement } from "@/lib/entitlements";
import { createOrder, reissueCode, voidCode, type OrderSource } from "@/lib/orders";

const actor = requireAdmin; // each action names the permission it needs (lib/auth/roles.ts)

function back(path: string, msg: string, kind: "ok" | "err" = "ok"): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createOrderAction(form: FormData) {
  const a = await actor("codes");
  const d = await db();
  const allKits = await d.select().from(kits);
  const lines = allKits.map((k) => ({ kitId: k.id, quantity: Number(str(form, `qty_${k.id}`) || 0) })).filter((l) => l.quantity > 0);
  if (!lines.length) back("/admin/orders", "Add a quantity for at least one kit.", "err");
  const joinCode = str(form, "school").toUpperCase();
  let orgId: string | null = null;
  if (joinCode) {
    const [org] = await d.select().from(organizations).where(eq(organizations.joinCode, joinCode));
    if (!org) back("/admin/orders", `No school has join code ${joinCode}.`, "err");
    orgId = org.id;
  }
  let result;
  try {
    result = await createOrder(a, {
      source: (str(form, "source") || "manual") as OrderSource,
      reference: str(form, "reference"),
      orgId,
      customerName: str(form, "customerName"),
      customerEmail: str(form, "customerEmail"),
      notes: str(form, "notes"),
      lines,
    });
  } catch (e) {
    back("/admin/orders", (e as Error).message, "err");
  }
  revalidatePath("/admin");
  back(`/admin/orders/${result!.order.id}`, result!.duplicate ? "An order with that reference already exists; showing it." : `Order created with ${result!.codes.length} code(s).`);
}

export async function reissueAction(form: FormData) {
  const a = await actor("codes");
  const r = await reissueCode(a, str(form, "codeId"), str(form, "reason") || "lost");
  const to = str(form, "back") || "/admin";
  if (!r.ok) back(to, r.error, "err");
  back(to, `Reissued. New code: ${r.fresh.code}`);
}

export async function voidAction(form: FormData) {
  const a = await actor("codes");
  const r = await voidCode(a, str(form, "codeId"), str(form, "reason") || "voided by support");
  back(str(form, "back") || "/admin", r ? "Code voided." : "Only active codes can be voided.", r ? "ok" : "err");
}

export async function grantAction(form: FormData) {
  const a = await actor("schools");
  const orgId = str(form, "orgId");
  await grantKitAccess(a, orgId, str(form, "kitId"), str(form, "reason") || "support fix");
  back(`/admin/schools/${orgId}`, "Kit access granted. It never expires.");
}

export async function revokeAction(form: FormData) {
  const a = await actor("schools");
  const orgId = str(form, "orgId");
  await revokeEntitlement(a, str(form, "entitlementId"), str(form, "reason") || "revoked by support");
  back(`/admin/schools/${orgId}`, "Access revoked.");
}

export async function restoreAction(form: FormData) {
  const a = await actor("schools");
  const orgId = str(form, "orgId");
  await restoreEntitlement(a, str(form, "entitlementId"));
  back(`/admin/schools/${orgId}`, "Access restored.");
}

export async function moveTeacherAction(form: FormData) {
  const a = await actor("teachers");
  const orgId = str(form, "orgId");
  const t = await moveTeacher(a, str(form, "email"), orgId);
  back(`/admin/schools/${orgId}`, t ? `${t.email} moved to this school.` : "No teacher with that email has signed in yet.", t ? "ok" : "err");
}

export async function setParentAction(form: FormData) {
  const a = await actor("schools");
  const orgId = str(form, "orgId");
  await setParent(a, orgId, str(form, "parentId") || null);
  back(`/admin/schools/${orgId}`, "District updated.");
}

export async function setDomainAction(form: FormData) {
  const a = await actor("schools");
  const orgId = str(form, "orgId");
  await setEmailDomain(a, orgId, str(form, "domain") || null);
  back(`/admin/schools/${orgId}`, "Verified email domain updated.");
}

export async function createOrgAction(form: FormData) {
  const a = await actor("schools");
  const name = str(form, "name");
  if (name.length < 3) back("/admin/schools", "Enter a name.", "err");
  const org = await createOrg(a, { name, type: str(form, "type") === "district" ? "district" : "school", state: str(form, "state"), emailDomain: str(form, "domain") || null });
  back(`/admin/schools/${org.id}`, `${org.type === "district" ? "District" : "School"} created.`);
}
