import type { NextRequest } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = redirectTo("/");
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
