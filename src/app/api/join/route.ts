import type { NextRequest } from "next/server";
import { joinClass, STUDENT_COOKIE } from "@/lib/classes";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const joined = await joinClass(String(form.get("code") ?? ""));
  if (!joined) return redirectTo("/join?error=code");
  if (joined.full) return redirectTo("/join?error=full");
  const res = redirectTo("/class");
  res.cookies.set(STUDENT_COOKIE, joined.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && !process.env.E2E, path: "/", maxAge: 180 * 86400 });
  return res;
}
