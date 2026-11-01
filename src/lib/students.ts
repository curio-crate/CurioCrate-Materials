import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { studentAccounts, studentAccountSessions } from "@/db/schema";
import { hashPassword, verifyPassword } from "./auth/admin";
import { isListNickname } from "./classes";
import { randomToken, sha256 } from "./crypto";
import { ageFrom, STUDENT_MIN_AGE, TERMS_VERSION } from "./terms";

// Free student accounts (ages 13+). They open the free lessons, labs and videos of every kit. Class-code students
// (src/lib/classes.ts) are separate and stay anonymous. An account stores only: email, password hash, a generated
// nickname, birth year and the accepted terms version. Students can delete it themselves at any time.

export const LEARNER_COOKIE = "cc_learner";
/** Set for a day when the age screen answers "under 13", so the form can't simply be retried with another year. */
export const AGE_GATE_COOKIE = "cc_age_gate";
const SESSION_DAYS = 30;
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;
export const MIN_STUDENT_PASSWORD = 8;

export const learnerCookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" && !process.env.E2E, path: "/", maxAge: SESSION_DAYS * 86400 });

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
let dummyHash: Promise<string> | null = null;

export type SignupInput = { email: string; password: string; nickname: string; birthYear: number; birthMonth: number; agree: boolean };

/** Checks the age screen. Returns "ok", "under" (younger than STUDENT_MIN_AGE) or "invalid". */
export function ageCheck(year: number, month: number, now = new Date()) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < now.getFullYear() - 100 || year > now.getFullYear()) return "invalid" as const;
  return ageFrom(year, month, now) < STUDENT_MIN_AGE ? ("under" as const) : ("ok" as const);
}

export async function createStudentAccount(input: SignupInput): Promise<{ ok: true; token: string } | { ok: false; error: string; under?: true }> {
  const age = ageCheck(input.birthYear, input.birthMonth);
  if (age === "invalid") return { ok: false, error: "Choose your birth month and year." };
  if (age === "under") return { ok: false, error: "under", under: true };
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_STUDENT_PASSWORD) return { ok: false, error: `Use at least ${MIN_STUDENT_PASSWORD} characters for your password.` };
  if (input.password.length > 200) return { ok: false, error: "That password is too long." };
  if (!isListNickname(input.nickname)) return { ok: false, error: "Pick one of the nicknames." };
  if (!input.agree) return { ok: false, error: "You need to agree to the Terms of Use and Privacy Policy." };
  const d = await db();
  const [taken] = await d.select({ id: studentAccounts.id }).from(studentAccounts).where(eq(studentAccounts.email, email));
  if (taken) return { ok: false, error: "There's already an account with that email. Sign in instead." };
  const [acct] = await d
    .insert(studentAccounts)
    .values({ email, passwordHash: await hashPassword(input.password), nickname: input.nickname, birthYear: input.birthYear, termsVersion: TERMS_VERSION })
    .onConflictDoNothing()
    .returning();
  if (!acct) return { ok: false, error: "There's already an account with that email. Sign in instead." };
  return { ok: true, token: await startSession(acct.id) };
}

async function startSession(accountId: string) {
  const d = await db();
  const token = randomToken();
  await d.delete(studentAccountSessions).where(and(eq(studentAccountSessions.accountId, accountId), lt(studentAccountSessions.expiresAt, new Date())));
  await d.insert(studentAccountSessions).values({ accountId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000) });
  return token;
}

const GENERIC = "That email and password don't match.";

export async function studentSignIn(emailRaw: string, password: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const d = await db();
  const [acct] = await d.select().from(studentAccounts).where(eq(studentAccounts.email, email));
  if (!acct) {
    // Same work as a real check, so timing doesn't reveal which emails have accounts.
    await verifyPassword(password, await (dummyHash ??= hashPassword(randomToken())));
    return { ok: false, error: GENERIC };
  }
  if (acct.lockedUntil && acct.lockedUntil > new Date()) return { ok: false, error: `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.` };
  if (!(await verifyPassword(password, acct.passwordHash))) {
    const fails = acct.failedLogins + 1;
    await d
      .update(studentAccounts)
      .set(fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedLogins: fails })
      .where(eq(studentAccounts.id, acct.id));
    return { ok: false, error: GENERIC };
  }
  await d.update(studentAccounts).set({ failedLogins: 0, lockedUntil: null, lastSeenAt: new Date() }).where(eq(studentAccounts.id, acct.id));
  return { ok: true, token: await startSession(acct.id) };
}

/** The signed-in student account for this request (cached per request), or null. */
export const currentLearner = cache(async () => {
  const token = (await cookies()).get(LEARNER_COOKIE)?.value;
  if (!token) return null;
  const d = await db();
  const [row] = await d
    .select({ id: studentAccounts.id, email: studentAccounts.email, nickname: studentAccounts.nickname, createdAt: studentAccounts.createdAt, sessionId: studentAccountSessions.id })
    .from(studentAccountSessions)
    .innerJoin(studentAccounts, eq(studentAccounts.id, studentAccountSessions.accountId))
    .where(and(eq(studentAccountSessions.tokenHash, sha256(token)), gt(studentAccountSessions.expiresAt, new Date())));
  return row ?? null;
});

export async function studentSignOut(token: string | undefined) {
  if (!token) return;
  const d = await db();
  await d.delete(studentAccountSessions).where(eq(studentAccountSessions.tokenHash, sha256(token)));
}

/** Deletes the account and all its sessions. Nothing else is stored about a student account. */
export async function deleteStudentAccount(accountId: string) {
  const d = await db();
  await d.delete(studentAccounts).where(eq(studentAccounts.id, accountId));
}
