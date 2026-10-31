import type { NextRequest } from "next/server";
import { currentStudent, isAssigned } from "@/lib/classes";
import { getContent } from "@/lib/content";
import { askCurie } from "@/lib/curie";
import { features } from "@/lib/features";
import { json, sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!features.curie || !sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const st = await currentStudent();
  if (!st) return json({ error: "join_class" }, 401);
  const body = (await req.json().catch(() => ({}))) as { message?: string; lesson?: string };
  const lesson = await getContent(String(body.lesson ?? ""));
  if (!lesson || !(await isAssigned(st.c.id, [lesson.id]))) return json({ error: "lesson" }, 400);
  if (!String(body.message ?? "").trim()) return json({ error: "empty" }, 400);
  const r = await askCurie({ classId: st.c.id, studentSessionId: st.s.id, contentSlug: lesson.slug, message: String(body.message) });
  if (!r.ok) return json({ error: r.error }, r.error === "limit" ? 429 : 403);
  return json(r);
}
