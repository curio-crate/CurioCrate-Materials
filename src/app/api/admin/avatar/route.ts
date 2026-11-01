import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { json, sameOrigin } from "@/lib/http";
import { removeAvatar, setAvatar } from "@/lib/team/people";
import { AVATAR_MAX_MB } from "@/lib/team/shared";

// The signed-in person's own profile picture: POST a new one (multipart "file"), DELETE to remove it.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return json({ error: "Choose a picture." }, 400);
  if (file.size > AVATAR_MAX_MB * 1024 * 1024) return json({ error: `Use a picture under ${AVATAR_MAX_MB} MB.` }, 400);
  const r = await setAvatar(actor.adminId, new Uint8Array(await file.arrayBuffer()));
  return r.ok ? json({ ok: true }) : json({ error: r.error }, 400);
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const actor = await studioMember();
  if (!actor) return json({ error: "Studio sign-in required." }, 401);
  await removeAvatar(actor.adminId);
  return json({ ok: true });
}
