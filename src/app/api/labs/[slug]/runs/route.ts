import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { currentStudent, saveLabRun } from "@/lib/classes";
import { json, sameOrigin } from "@/lib/http";
import { labBySlug } from "@/lib/labs";

// Saves lab results. Values are numbers/short strings only; free text is never accepted from students.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/labs/[slug]/runs">) {
  const { slug } = await ctx.params;
  if (!sameOrigin(req) || !labBySlug(slug)) return json({ error: "bad request" }, 400);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, number | string | boolean | number[]> = {};
  for (const [k, v] of Object.entries(body).slice(0, 12)) {
    if (typeof v === "number" || typeof v === "boolean") data[k.slice(0, 24)] = v;
    else if (typeof v === "string") data[k.slice(0, 24)] = v.replace(/[^\w\s.,/>()%$-]/g, "").slice(0, 80);
    else if (Array.isArray(v)) data[k.slice(0, 24)] = v.filter((x) => typeof x === "number").slice(0, 12) as number[];
  }
  const st = await currentStudent();
  if (st) return json(await saveLabRun(slug, data, { classId: st.c.id, studentSessionId: st.s.id }));
  const v = await getViewer();
  if (v) return json(await saveLabRun(slug, data, { teacherId: v.teacher.id }));
  return json({ error: "sign_in" }, 401);
}
