import type { NextRequest } from "next/server";
import { purgeOldChats } from "@/lib/curie";
import { env } from "@/lib/env";
import { json } from "@/lib/http";
import { expireSubscriptions } from "@/lib/subscriptions";
import { notifyOverdueTasks } from "@/lib/team/tasks";
import { purgeExpiredTrash } from "@/lib/team/trash";

// Daily (vercel.json): delete Curie.AI chats past retention, close out ended subscriptions, delete for good what has
// been in Recently deleted for 30 days, and remind people about overdue to-dos.
export async function GET(req: NextRequest) {
  const secret = env.cronSecret();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  return json({ chatsDeleted: await purgeOldChats(), subscriptionsEnded: await expireSubscriptions(), trashPurged: await purgeExpiredTrash(), overdueTasks: await notifyOverdueTasks() });
}
