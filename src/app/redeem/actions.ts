"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { redeemCode, type RedeemResult } from "@/lib/redeem";

export type RedeemState = (RedeemResult & { code: string }) | null;

export async function redeemAction(_: RedeemState, form: FormData): Promise<RedeemState> {
  const code = String(form.get("code") ?? "");
  const v = await getViewer();
  if (!v) redirect(`/signin?next=${encodeURIComponent(`/redeem?code=${code}`)}`);
  if (!v.org) redirect(`/onboarding?next=${encodeURIComponent(`/redeem?code=${code}`)}`);
  const result = await redeemCode(v.teacher.id, code);
  if (result.ok) revalidatePath("/", "layout");
  return { ...result, code };
}
