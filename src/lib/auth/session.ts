import "server-only";
import { and, desc, eq, gt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, organizations, sessions, teachers } from "@/db/schema";
import { hmac, randomToken, sha256 } from "../crypto";

export const SESSION_COOKIE = "cc_session";
export const SESSION_DAYS = 30;
/** Devices a teacher can be signed in on at once. Signing in on another one signs out the oldest. */
export const MAX_DEVICES = 3;

/** Keyed hash of an IP address: lets Studio spot one account used from many places without storing IPs. */
export const ipHash = (ip: string | null | undefined) => (ip ? hmac(`ip:${ip}`).slice(0, 16) : null);

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && !process.env.E2E,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  };
}

/**
 * Creates a session and returns the raw cookie token. Only its SHA-256 is stored. Keeps at most MAX_DEVICES
 * sessions per teacher, so one teacher's sign-in can't be handed around a department.
 */
export async function createSession(teacherId: string, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  const token = randomToken();
  const d = await db();
  const ip = ipHash(meta.ip);
  await d.insert(sessions).values({ id: sha256(token), teacherId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000), ipHash: ip, userAgent: meta.userAgent?.slice(0, 160) ?? null });
  const keep = await d.select({ id: sessions.id }).from(sessions).where(eq(sessions.teacherId, teacherId)).orderBy(desc(sessions.createdAt)).limit(MAX_DEVICES);
  await d.delete(sessions).where(and(eq(sessions.teacherId, teacherId), notInArray(sessions.id, keep.map((k) => k.id))));
  await d.update(teachers).set({ lastSeenAt: new Date() }).where(eq(teachers.id, teacherId));
  await d.insert(auditLog).values({ actorTeacherId: teacherId, action: "auth.signin", targetType: "teacher", targetId: teacherId, details: { ip } });
  return token;
}

/** Signs a teacher out on every device (Studio support action, account deletion). */
export async function destroyAllSessions(teacherId: string) {
  const d = await db();
  await d.delete(sessions).where(eq(sessions.teacherId, teacherId));
}

export async function teacherForSession(token: string | undefined) {
  if (!token) return null;
  const d = await db();
  const [row] = await d
    .select({ teacher: teachers, org: organizations })
    .from(sessions)
    .innerJoin(teachers, eq(teachers.id, sessions.teacherId))
    .leftJoin(organizations, eq(organizations.id, teachers.orgId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const d = await db();
  await d.delete(sessions).where(eq(sessions.id, sha256(token)));
}
