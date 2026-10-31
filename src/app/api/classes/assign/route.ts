import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { ownedClass, setAssigned } from "@/lib/classes";
import { getContent } from "@/lib/content";
import { json, sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const v = await getViewer();
  if (!v) return json({ error: "sign_in" }, 401);
  const f = await req.formData();
  const c = await ownedClass(String(f.get("classId")), v.teacher.id);
  const item = await getContent(String(f.get("slug")));
  if (!c || !item) return json({ error: "not_found" }, 404);
  await setAssigned(c.id, item.id, f.get("on") === "1");
  return json({ ok: true });
}
