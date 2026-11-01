import type { NextRequest } from "next/server";
import { json, redirectTo, sameOrigin } from "@/lib/http";
import { LEARNER_COOKIE, studentSignOut } from "@/lib/students";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "bad request" }, 400);
  await studentSignOut(req.cookies.get(LEARNER_COOKIE)?.value);
  const res = redirectTo("/");
  res.cookies.delete(LEARNER_COOKIE);
  return res;
}
