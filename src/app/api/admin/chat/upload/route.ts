import type { NextRequest } from "next/server";
import { studioMember } from "@/lib/auth/viewer";
import { json, sameOrigin } from "@/lib/http";
import { presignUpload } from "@/lib/storage";
import { newChatKey } from "@/lib/team/chat";
import { CHAT_MAX_MB, chatFileAllowed } from "@/lib/team/shared";

// Step 1 of a chat attachment: checks the name and size and returns a presigned PUT straight to the bucket.
// The message is then sent with the returned key (POST /api/admin/chat/messages), which checks the stored file.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (!(await studioMember())) return json({ error: "Studio sign-in required." }, 401);
  const b = (await req.json().catch(() => ({}))) as { name?: string; size?: number };
  const name = String(b.name ?? "").slice(0, 200);
  const size = Number(b.size ?? 0);
  if (!name || !size) return json({ error: "Choose a file." }, 400);
  if (!chatFileAllowed(name)) return json({ error: `“${name}” can't be sent in chat. Zip it first.` }, 400);
  if (size > CHAT_MAX_MB * 1024 * 1024) return json({ error: `Files can be up to ${CHAT_MAX_MB} MB.` }, 400);
  const key = newChatKey(name);
  return json({ key, ...(await presignUpload(key, "application/octet-stream")) });
}
