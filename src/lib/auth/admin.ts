import "server-only";
import { and, count, eq, gt, ne } from "drizzle-orm";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { adminSessions, adminUsers, auditLog } from "@/db/schema";
import { randomToken, sha256, signToken, verifyToken } from "../crypto";

// Company (Curiocrate Studio) accounts. Studio is reachable ONLY with a Studio username + password: teacher
// Google sign-in never grants Studio access. Accounts live in the database (admin_users), so the team can add
// people later from Studio → Team. Sessions are database rows behind a signed cookie, so signing out, disabling
// an account or changing a password ends its sessions everywhere.

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export const ADMIN_COOKIE = "cc_admin";
export const ADMIN_COOKIE_AUDIENCE = "company-admin";
const TTL = 12 * 3600;
export const MIN_PASSWORD = 12;
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

// Initial account for local development and the automated tests only (its password is in the e2e suite).
// A deployed site (any VERCEL_ENV) never uses it: the first account comes from ADMIN_USERNAME + ADMIN_PASSWORD.
const DEV_USERNAME = "CurioCrateAdmin";
const DEV_HASH =
  "scrypt:b0903c529ac89dc31a9df2223fc7cfb3:f2689dc6bcb985b2b33bb658e6267a4813df78897af30ef8b7286916051972856e59ec5ad8d9370bbd851a7c5ef067a47de3ef1b61dde488596f3b19971a7ae0";
const DUMMY_HASH = DEV_HASH; // compared against when a username does not exist, so timing doesn't reveal it

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const got = await scrypt(password, salt, 64);
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

export function passwordProblem(password: string, username?: string) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "The password can't contain the username.";
  if (new Set(password).size < 6) return "Use a less repetitive password.";
  return null;
}

const onDeployedSite = () => !!process.env.VERCEL_ENV;

/**
 * Creates the first Studio account when there is none. On a deployed site that needs ADMIN_USERNAME and
 * ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in the environment. ADMIN_PASSWORD_RESET=1 resets that account's
 * password to the environment value (account recovery; remove the variable afterwards).
 */
export async function ensureBootstrapAdmin() {
  const d = await db();
  const username = process.env.ADMIN_USERNAME?.trim() || DEV_USERNAME;
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim() || (process.env.ADMIN_PASSWORD ? await hashPassword(process.env.ADMIN_PASSWORD) : null);
  const [{ n }] = await d.select({ n: count() }).from(adminUsers);
  if (n === 0) {
    const hash = envHash ?? (onDeployedSite() ? null : DEV_HASH);
    if (!hash) return { ready: false as const };
    await d.insert(adminUsers).values({ username, name: username, passwordHash: hash }).onConflictDoNothing();
    return { ready: true as const };
  }
  if (process.env.ADMIN_PASSWORD_RESET === "1" && envHash) {
    const [u] = await d.update(adminUsers).set({ passwordHash: envHash, active: true, failedLogins: 0, lockedUntil: null, passwordChangedAt: new Date() }).where(eq(adminUsers.username, username)).returning();
    if (u) await d.delete(adminSessions).where(eq(adminSessions.adminId, u.id));
    else await d.insert(adminUsers).values({ username, name: username, passwordHash: envHash });
  }
  return { ready: true as const };
}

// Best-effort per-IP limiter on top of the per-account lockout stored in the database.
const ipFails = new Map<string, { n: number; until: number }>();

export async function adminLogin(username: string, password: string, clientKey: string) {
  const ip = ipFails.get(clientKey);
  if (ip && ip.until > Date.now()) return { ok: false as const, error: "Too many attempts. Try again in 15 minutes." };
  const boot = await ensureBootstrapAdmin();
  if (!boot.ready) return { ok: false as const, error: "Studio isn't set up yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in the hosting environment, then sign in." };

  const d = await db();
  const [user] = await d.select().from(adminUsers).where(eq(adminUsers.username, username));
  const failIp = () => {
    const n = (ip?.n ?? 0) + 1;
    ipFails.set(clientKey, { n, until: n >= MAX_FAILS * 2 ? Date.now() + LOCK_MINUTES * 60_000 : 0 });
  };
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    failIp();
    return { ok: false as const, error: "Wrong username or password." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false as const, error: `This account is locked after too many wrong passwords. Try again after ${user.lockedUntil.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` };
  const good = await verifyPassword(password, user.passwordHash);
  if (!good || !user.active) {
    failIp();
    if (!good) {
      const fails = user.failedLogins + 1;
      await d.update(adminUsers).set({ failedLogins: fails >= MAX_FAILS ? 0 : fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null }).where(eq(adminUsers.id, user.id));
      await d.insert(auditLog).values({ actorEmail: user.username, action: fails >= MAX_FAILS ? "admin.locked" : "admin.login_failed", targetType: "admin", targetId: user.id, details: {} });
    }
    return { ok: false as const, error: good ? "This Studio account is disabled." : "Wrong username or password." };
  }
  ipFails.delete(clientKey);
  const sid = randomToken();
  await d.insert(adminSessions).values({ id: sha256(sid), adminId: user.id, expiresAt: new Date(Date.now() + TTL * 1000) });
  await d.update(adminUsers).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await d.insert(auditLog).values({ actorEmail: user.username, action: "admin.login", targetType: "admin", targetId: user.id, details: {} });
  return { ok: true as const, token: await signToken({ sid, sub: user.id }, TTL, ADMIN_COOKIE_AUDIENCE) };
}

export const adminCookieOptions = () => ({ httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" && !process.env.E2E, path: "/", maxAge: TTL });

export type CompanyAdmin = { id: string; username: string; name: string; sessionId: string };

/** The signed-in Studio account (signature AND a live session row AND an active account), or null. */
export const getCompanyAdmin = cache(async (): Promise<CompanyAdmin | null> => {
  const claims = await verifyToken<{ sid: string; sub: string }>((await cookies()).get(ADMIN_COOKIE)?.value, ADMIN_COOKIE_AUDIENCE);
  if (!claims?.sid) return null;
  const d = await db();
  const [row] = await d
    .select({ id: adminUsers.id, username: adminUsers.username, name: adminUsers.name, active: adminUsers.active, sessionId: adminSessions.id })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(and(eq(adminSessions.id, sha256(claims.sid)), gt(adminSessions.expiresAt, new Date())));
  if (!row || !row.active || row.id !== claims.sub) return null;
  return { id: row.id, username: row.username, name: row.name, sessionId: row.sessionId };
});

export async function adminLogout(token: string | undefined) {
  const claims = await verifyToken<{ sid: string }>(token, ADMIN_COOKIE_AUDIENCE);
  if (!claims?.sid) return;
  const d = await db();
  await d.delete(adminSessions).where(eq(adminSessions.id, sha256(claims.sid)));
}

// ---------- Team management (Studio → Team) ----------

export async function listAdmins() {
  const d = await db();
  return d.select({ id: adminUsers.id, username: adminUsers.username, name: adminUsers.name, active: adminUsers.active, lastLoginAt: adminUsers.lastLoginAt, lockedUntil: adminUsers.lockedUntil, createdAt: adminUsers.createdAt }).from(adminUsers).orderBy(adminUsers.createdAt);
}

async function teamAudit(actor: CompanyAdmin, action: string, targetId: string, details: Record<string, unknown> = {}) {
  const d = await db();
  await d.insert(auditLog).values({ actorEmail: actor.username, action, targetType: "admin", targetId, details });
}

export async function createAdmin(actor: CompanyAdmin, input: { username: string; name: string; password: string }) {
  const username = input.username.trim();
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) return { ok: false as const, error: "Usernames are 3-40 letters, numbers, dots, dashes or underscores." };
  const problem = passwordProblem(input.password, username);
  if (problem) return { ok: false as const, error: problem };
  const d = await db();
  const [row] = await d.insert(adminUsers).values({ username, name: input.name.trim() || username, passwordHash: await hashPassword(input.password) }).onConflictDoNothing().returning();
  if (!row) return { ok: false as const, error: "That username is taken." };
  await teamAudit(actor, "admin.create", row.id, { username });
  return { ok: true as const };
}

async function activeAdminCount() {
  const d = await db();
  const [{ n }] = await d.select({ n: count() }).from(adminUsers).where(eq(adminUsers.active, true));
  return n;
}

export async function setAdminActive(actor: CompanyAdmin, id: string, active: boolean) {
  if (!active && id === actor.id) return { ok: false as const, error: "You can't disable your own account." };
  if (!active && (await activeAdminCount()) <= 1) return { ok: false as const, error: "Keep at least one active Studio account." };
  const d = await db();
  await d.update(adminUsers).set({ active, failedLogins: 0, lockedUntil: null }).where(eq(adminUsers.id, id));
  if (!active) await d.delete(adminSessions).where(eq(adminSessions.adminId, id));
  await teamAudit(actor, active ? "admin.enable" : "admin.disable", id);
  return { ok: true as const };
}

export async function resetAdminPassword(actor: CompanyAdmin, id: string, password: string) {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(eq(adminUsers.id, id));
  if (!u) return { ok: false as const, error: "Account not found." };
  const problem = passwordProblem(password, u.username);
  if (problem) return { ok: false as const, error: problem };
  await d.update(adminUsers).set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null }).where(eq(adminUsers.id, id));
  // Ends every session of that account (except the one making the change, if it is their own).
  await d.delete(adminSessions).where(id === actor.id ? and(eq(adminSessions.adminId, id), ne(adminSessions.id, actor.sessionId)) : eq(adminSessions.adminId, id));
  await teamAudit(actor, id === actor.id ? "admin.change_password" : "admin.reset_password", id);
  return { ok: true as const };
}

export async function changeOwnPassword(actor: CompanyAdmin, current: string, next: string) {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(eq(adminUsers.id, actor.id));
  if (!u || !(await verifyPassword(current, u.passwordHash))) return { ok: false as const, error: "Your current password is wrong." };
  if (current === next) return { ok: false as const, error: "Choose a new password." };
  return resetAdminPassword(actor, actor.id, next);
}

/** True while the signed-in account still uses the development password (never true on a deployed site). */
export async function usesDevPassword(adminId: string) {
  const d = await db();
  const [u] = await d.select({ h: adminUsers.passwordHash }).from(adminUsers).where(eq(adminUsers.id, adminId));
  return u?.h === DEV_HASH;
}
