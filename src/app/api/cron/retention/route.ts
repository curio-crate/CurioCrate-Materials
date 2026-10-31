import type { NextRequest } from "next/server";
import { purgeOldChats } from "@/lib/curie";
import { env } from "@/lib/env";
import { json } from "@/lib/http";
import { expireSubscriptions } from "@/lib/subscriptions";

// Daily (vercel.json): delete Curie.AI chats past retention and close out ended subscriptions.
export async function GET(req: NextRequest) {
  const secret = env.cronSecret();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  return json({ chatsDeleted: await purgeOldChats(), subscriptionsEnded: await expireSubscriptions() });
}
