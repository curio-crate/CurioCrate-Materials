import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, adminLogout } from "@/lib/auth/admin";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  await adminLogout(req.cookies.get(ADMIN_COOKIE)?.value);
  const res = redirectTo("/company/login");
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
