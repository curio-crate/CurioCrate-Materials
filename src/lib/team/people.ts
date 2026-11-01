import "server-only";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { deleteObject, getObjectBytes, putObject } from "../storage";
import { asRole, type StudioRole } from "../auth/roles";
import { AVATAR_MAX_MB } from "./shared";

export type TeamMember = { id: string; name: string; email: string | null; username: string; role: StudioRole; avatarKey: string | null; active: boolean };

/** Every Studio account (chat directory, task assignees, avatars). */
export async function teamDirectory(): Promise<TeamMember[]> {
  const d = await db();
  const rows = await d
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, username: adminUsers.username, role: adminUsers.role, avatarKey: adminUsers.avatarKey, active: adminUsers.active })
    .from(adminUsers)
    .orderBy(adminUsers.name);
  return rows.map((r) => ({ ...r, role: asRole(r.role) }));
}

export async function teamMember(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await teamDirectory()).find((m) => m.id === id) ?? null;
}

/** The image type from its first bytes (PNG, JPEG, GIF, WebP), or null. Never trusts the file name. */
export function sniffImage(head: Uint8Array): { mime: string; ext: string } | null {
  const b = (at: number, ...xs: number[]) => xs.every((x, i) => head[at + i] === x);
  if (b(0, 0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (b(0, 0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (b(0, 0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", ext: "gif" };
  if (b(0, 0x52, 0x49, 0x46, 0x46) && b(8, 0x57, 0x45, 0x42, 0x50)) return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Saves a new profile picture (PNG, JPEG or WebP up to 2 MB) and removes the old one. */
export async function setAvatar(adminId: string, bytes: Uint8Array) {
  if (bytes.length > AVATAR_MAX_MB * 1024 * 1024) return { ok: false as const, error: `Use a picture under ${AVATAR_MAX_MB} MB.` };
  const kind = sniffImage(bytes);
  if (!kind || kind.ext === "gif") return { ok: false as const, error: "Use a PNG, JPG or WebP picture." };
  const d = await db();
  const [me] = await d.select({ key: adminUsers.avatarKey }).from(adminUsers).where(eq(adminUsers.id, adminId));
  if (!me) return { ok: false as const, error: "Account not found." };
  const key = `avatars/${adminId}/${randomUUID()}.${kind.ext}`;
  await putObject(key, bytes, kind.mime);
  await d.update(adminUsers).set({ avatarKey: key }).where(eq(adminUsers.id, adminId));
  if (me.key) await deleteObject(me.key).catch(() => {});
  return { ok: true as const, key };
}

export async function removeAvatar(adminId: string) {
  const d = await db();
  const [me] = await d.select({ key: adminUsers.avatarKey }).from(adminUsers).where(eq(adminUsers.id, adminId));
  await d.update(adminUsers).set({ avatarKey: null }).where(eq(adminUsers.id, adminId));
  if (me?.key) await deleteObject(me.key).catch(() => {});
}

/** The stored picture's bytes and type, for /api/admin/avatar/[id]. */
export async function readAvatar(adminId: string) {
  const m = await teamMember(adminId);
  if (!m?.avatarKey) return null;
  const bytes = await getObjectBytes(m.avatarKey);
  const kind = bytes && sniffImage(bytes);
  return bytes && kind ? { bytes, mime: kind.mime } : null;
}
