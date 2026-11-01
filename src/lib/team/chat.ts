import "server-only";
import { and, asc, count, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { adminUsers, chatMessages, chatReads, trash } from "@/db/schema";
import { getObjectBytes, headObject } from "../storage";
import { sniffImage } from "./people";
import { canReadChannel, CHAT_IMAGE_EXT, CHAT_MAX_MB, CHAT_MAX_MESSAGE, chatFileAllowed, dmMembers, fileExt, PUBLIC_CHANNELS } from "./shared";
import type { TeamActor } from "./tasks";

// Studio chat. Messages are rows in Postgres; browsers poll for "everything that changed since" every couple of
// seconds (works on serverless hosting with no socket server). Files go straight from the browser to the bucket.

export const TRASH_DAYS = 30;
const OVERLAP_MS = 3000; // polls overlap a little so a message saved during a poll is never missed (clients dedupe by id)

export type ChatMessageDTO = {
  id: string;
  channel: string;
  senderId: string;
  body: string;
  file: { name: string; bytes: number | null; isImage: boolean } | null;
  createdAt: string;
  deleted: boolean;
};

const toDTO = (m: typeof chatMessages.$inferSelect): ChatMessageDTO => ({
  id: m.id,
  channel: m.channel,
  senderId: m.senderId,
  body: m.deletedAt ? "" : m.body,
  file: m.fileKey && !m.deletedAt ? { name: m.fileName ?? "file", bytes: m.fileBytes, isImage: m.isImage } : null,
  createdAt: m.createdAt.toISOString(),
  deleted: !!m.deletedAt,
});

/** Where a chat upload is stored. Random, so a key can't be guessed. */
export function newChatKey(name: string) {
  const safe = name.replace(/[^\w.-]/g, "_").slice(-80) || "file";
  return `chat/${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${safe}`;
}
const isChatKey = (k: string) => /^chat\/\d{4}-\d{2}\/[0-9a-f-]{36}-[\w.-]+$/.test(k);

export function channelLabel(channel: string, names: Map<string, string>) {
  const pub = PUBLIC_CHANNELS.find((p) => p.id === channel);
  if (pub) return `# ${pub.label}`;
  const m = dmMembers(channel);
  return m ? `Private chat between ${m.map((x) => names.get(x) ?? "a teammate").join(" and ")}` : channel;
}

async function checkChannel(actor: TeamActor, channel: string) {
  if (!canReadChannel(actor.adminId, channel)) return "You can't open that conversation.";
  const m = dmMembers(channel);
  if (m) {
    const d = await db();
    const other = m.find((x) => x !== actor.adminId) ?? actor.adminId;
    const [u] = await d.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.id, other));
    if (!u) return "That person no longer has a Studio account.";
  }
  return null;
}

export async function sendMessage(actor: TeamActor, input: { channel: string; body: string; file?: { key: string; name: string } | null }) {
  const problem = await checkChannel(actor, input.channel);
  if (problem) return { ok: false as const, error: problem };
  const body = (input.body ?? "").replace(/\r/g, "").trim();
  if (body.length > CHAT_MAX_MESSAGE) return { ok: false as const, error: `Messages can be up to ${CHAT_MAX_MESSAGE} characters.` };
  let file: { fileKey: string; fileName: string; fileBytes: number; isImage: boolean } | null = null;
  if (input.file) {
    const name = String(input.file.name ?? "").slice(0, 200);
    if (!isChatKey(input.file.key) || !chatFileAllowed(name)) return { ok: false as const, error: "That file can't be sent." };
    const head = await headObject(input.file.key);
    if (!head) return { ok: false as const, error: "The file didn't finish uploading. Try again." };
    if (head.size > CHAT_MAX_MB * 1024 * 1024) return { ok: false as const, error: `Files can be up to ${CHAT_MAX_MB} MB.` };
    const first = CHAT_IMAGE_EXT.includes(fileExt(name)) ? await getObjectBytes(input.file.key, 16) : null;
    file = { fileKey: input.file.key, fileName: name.replace(/[\u0000-\u001f"\\/]/g, "_"), fileBytes: head.size, isImage: !!first && !!sniffImage(first) };
  }
  if (!body && !file) return { ok: false as const, error: "Write a message or attach a file." };
  const d = await db();
  const now = new Date();
  const [row] = await d
    .insert(chatMessages)
    .values({ channel: input.channel, senderId: actor.adminId, body, ...file, createdAt: now, updatedAt: now })
    .returning();
  await markRead(actor.adminId, input.channel, now);
  return { ok: true as const, message: toDTO(row) };
}

/**
 * A conversation: the latest 150 messages, or (with `since`) every message sent, deleted or restored after that
 * moment. Returns the server time to pass back as the next `since`.
 */
export async function channelMessages(actor: TeamActor, channel: string, since?: Date | null) {
  const problem = await checkChannel(actor, channel);
  if (problem) return { ok: false as const, error: problem };
  const d = await db();
  const now = new Date();
  let rows;
  if (since) {
    rows = await d
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.channel, channel), gt(chatMessages.updatedAt, new Date(since.getTime() - OVERLAP_MS))))
      .orderBy(asc(chatMessages.createdAt))
      .limit(500);
  } else {
    rows = (await d.select().from(chatMessages).where(and(eq(chatMessages.channel, channel), isNull(chatMessages.deletedAt))).orderBy(desc(chatMessages.createdAt)).limit(150)).reverse();
  }
  await markRead(actor.adminId, channel, now);
  return { ok: true as const, now: now.toISOString(), messages: rows.map(toDTO) };
}

export async function markRead(adminId: string, channel: string, at = new Date()) {
  const d = await db();
  await d.insert(chatReads).values({ adminId, channel, lastReadAt: at }).onConflictDoUpdate({ target: [chatReads.adminId, chatReads.channel], set: { lastReadAt: at } });
}

/** Unread messages per conversation this person can see (others' messages after they last read it). */
export async function unreadByChannel(adminId: string): Promise<Record<string, number>> {
  const d = await db();
  const rows = await d
    .select({ channel: chatMessages.channel, n: count() })
    .from(chatMessages)
    .leftJoin(chatReads, and(eq(chatReads.channel, chatMessages.channel), eq(chatReads.adminId, adminId)))
    .where(
      and(
        ne(chatMessages.senderId, adminId),
        isNull(chatMessages.deletedAt),
        or(sql`${chatMessages.channel} in ('all', 'curriculum', 'production')`, sql`${chatMessages.channel} like ${`dm:%${adminId}%`}`),
        or(isNull(chatReads.lastReadAt), gt(chatMessages.createdAt, chatReads.lastReadAt)),
      ),
    )
    .groupBy(chatMessages.channel);
  return Object.fromEntries(rows.filter((r) => canReadChannel(adminId, r.channel)).map((r) => [r.channel, Number(r.n)]));
}

/** A message whose file this person may open (for /api/admin/chat/file). */
export async function chatFile(actor: TeamActor, messageId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return null;
  const d = await db();
  const [m] = await d.select().from(chatMessages).where(eq(chatMessages.id, messageId));
  if (!m?.fileKey || m.deletedAt || !canReadChannel(actor.adminId, m.channel)) return null;
  return m;
}

/** Deletes a message (its sender, or an admin). It moves to Recently deleted, where admins can restore it. */
export async function deleteMessage(actor: TeamActor, messageId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return { ok: false as const, error: "Message not found." };
  const d = await db();
  const [m] = await d.select().from(chatMessages).where(eq(chatMessages.id, messageId));
  if (!m || m.deletedAt) return { ok: true as const };
  if (m.senderId !== actor.adminId && actor.role !== "admin") return { ok: false as const, error: "You can only delete your own messages." };
  const now = new Date();
  const [me] = await d.select({ name: adminUsers.name }).from(adminUsers).where(eq(adminUsers.id, actor.adminId));
  const names = new Map((await d.select({ id: adminUsers.id, name: adminUsers.name }).from(adminUsers)).map((u) => [u.id, u.name]));
  await d.transaction(async (tx) => {
    await tx.update(chatMessages).set({ deletedAt: now, updatedAt: now }).where(eq(chatMessages.id, m.id));
    await tx.insert(trash).values({
      kind: "message",
      title: m.fileName ? `File: ${m.fileName}` : m.body.length > 80 ? `${m.body.slice(0, 80)}…` : m.body || "Message",
      detail: `${channelLabel(m.channel, names)} · sent by ${names.get(m.senderId) ?? "a teammate"}`,
      payload: { messageId: m.id },
      deletedById: actor.adminId,
      deletedByName: me?.name ?? actor.email,
      deletedAt: now,
      purgeAfter: new Date(now.getTime() + TRASH_DAYS * 86400_000),
    });
  });
  return { ok: true as const };
}
