import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, authAccounts, organizations, teachers } from "@/db/schema";
import type { Profile, ProviderId } from "./auth/providers";
import { newShortCode } from "./codes";

const PUBLIC_EMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "proton.me", "protonmail.com"]);

export function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function isPublicEmailDomain(domain: string) {
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}

/** Find or create the teacher for a provider login. Links accounts by verified email. */
export async function upsertTeacherFromProfile(provider: ProviderId, profile: Profile) {
  const d = await db();
  const email = profile.email.toLowerCase();
  const [linked] = await d
    .select({ teacher: teachers })
    .from(authAccounts)
    .innerJoin(teachers, eq(teachers.id, authAccounts.teacherId))
    .where(and(eq(authAccounts.provider, provider), eq(authAccounts.providerAccountId, profile.sub)));

  let teacher = linked?.teacher;
  if (!teacher) {
    if (!profile.emailVerified) throw new Error("email not verified by provider");
    [teacher] = await d.select().from(teachers).where(eq(teachers.email, email));
    if (!teacher) {
      [teacher] = await d.insert(teachers).values({ email, name: profile.name || email }).returning();
    }
    await d.insert(authAccounts).values({ teacherId: teacher.id, provider, providerAccountId: profile.sub }).onConflictDoNothing();
  }

  if (profile.name && teacher.name !== profile.name) {
    [teacher] = await d.update(teachers).set({ name: profile.name }).where(eq(teachers.id, teacher.id)).returning();
  }

  // Auto-join a school whose verified email domain matches (never for public webmail domains).
  if (!teacher.orgId && profile.emailVerified) {
    const domain = emailDomain(email);
    if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) {
      const [org] = await d.select().from(organizations).where(and(eq(organizations.emailDomain, domain), eq(organizations.type, "school")));
      if (org) {
        [teacher] = await d.update(teachers).set({ orgId: org.id }).where(eq(teachers.id, teacher.id)).returning();
        await d.insert(auditLog).values({ actorTeacherId: teacher.id, actorEmail: email, action: "school.auto_join", targetType: "organization", targetId: org.id, orgId: org.id, details: { domain } });
      }
    }
  }
  return teacher;
}

/** A teacher sets up their school. They become its admin; colleagues join with the school join code. */
export async function createSchoolForTeacher(teacherId: string, input: { name: string; city?: string; state?: string; claimDomain?: boolean }) {
  const d = await db();
  const [teacher] = await d.select().from(teachers).where(eq(teachers.id, teacherId));
  if (!teacher) throw new Error("teacher not found");
  if (teacher.orgId) return teacher.orgId;
  const domain = emailDomain(teacher.email);
  const claim = input.claimDomain && domain && !PUBLIC_EMAIL_DOMAINS.has(domain);
  const [taken] = claim ? await d.select().from(organizations).where(eq(organizations.emailDomain, domain)) : [];
  const [org] = await d
    .insert(organizations)
    .values({ name: input.name.trim(), type: "school", city: input.city?.trim() || null, state: input.state?.trim() || null, joinCode: newShortCode(6), emailDomain: claim && !taken ? domain : null })
    .returning();
  await d.update(teachers).set({ orgId: org.id, isOrgAdmin: true }).where(and(eq(teachers.id, teacherId), isNull(teachers.orgId)));
  await d.insert(auditLog).values({ actorTeacherId: teacherId, actorEmail: teacher.email, action: "school.create", targetType: "organization", targetId: org.id, orgId: org.id, details: { name: org.name } });
  return org.id;
}

/**
 * A teacher joins an existing school using the join code a colleague shared. They wait as "pending" until the
 * school admin approves them (no school-wide access meanwhile), so a join code passed outside the school is
 * worthless. The first teacher into a school that has nobody yet (e.g. one Curiocrate set up) becomes its admin.
 */
export async function joinSchoolWithCode(teacherId: string, joinCode: string) {
  const d = await db();
  const code = joinCode.toUpperCase().replace(/[^A-Z]/g, "");
  const [org] = await d.select().from(organizations).where(eq(organizations.joinCode, code));
  if (!org) return { ok: false as const, error: "That school code was not found. Check it with a colleague." };
  const [{ n }] = await d.select({ n: count() }).from(teachers).where(and(eq(teachers.orgId, org.id), eq(teachers.membership, "active")));
  const first = n === 0;
  await d.update(teachers).set({ orgId: org.id, membership: first ? "active" : "pending", isOrgAdmin: first }).where(eq(teachers.id, teacherId));
  await d.insert(auditLog).values({ actorTeacherId: teacherId, action: first ? "school.join" : "school.join_requested", targetType: "organization", targetId: org.id, orgId: org.id, details: {} });
  return { ok: true as const, org, pending: !first };
}

/** School admin (or Curiocrate in Studio) approves a pending colleague, or removes a teacher from the school. */
export async function decideMembership(actor: { teacherId: string | null; email: string; orgId: string | null }, teacherId: string, approve: boolean) {
  const d = await db();
  const [t] = await d.select().from(teachers).where(eq(teachers.id, teacherId));
  if (!t || !t.orgId || (actor.orgId && t.orgId !== actor.orgId)) return null;
  if (approve) await d.update(teachers).set({ membership: "active" }).where(eq(teachers.id, teacherId));
  else await d.update(teachers).set({ orgId: null, membership: "active", isOrgAdmin: false }).where(eq(teachers.id, teacherId));
  await d.insert(auditLog).values({ actorTeacherId: actor.teacherId, actorEmail: actor.email, action: approve ? "school.member_approved" : "school.member_removed", targetType: "teacher", targetId: teacherId, orgId: t.orgId, details: { email: t.email } });
  return t;
}
