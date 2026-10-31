import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentItems, kits, teachers } from "@/db/schema";
import type { Principal } from "@/lib/access";
import { createOrder } from "@/lib/orders";
import { createSchoolForTeacher, decideMembership, joinSchoolWithCode, upsertTeacherFromProfile } from "@/lib/teachers";
import { organizations } from "@/db/schema";

let n = 0;
export async function makeTeacher(opts: { email?: string; school?: string | null } = {}) {
  n++;
  const email = opts.email ?? `teacher${n}-${Math.random().toString(36).slice(2, 7)}@school${n}.test`;
  const teacher = await upsertTeacherFromProfile("google", { sub: `sub-${email}`, email, name: `Teacher ${n}`, emailVerified: true });
  if (opts.school !== null) await createSchoolForTeacher(teacher.id, { name: opts.school ?? `School ${n}` });
  const d = await db();
  const [t] = await d.select().from(teachers).where(eq(teachers.id, teacher.id));
  return t;
}

/** A teacher who joins the school with its join code: pending until approved (approve: true approves them). */
export async function addColleague(orgId: string, opts: { approve?: boolean } = {}) {
  const t = await makeTeacher({ school: null });
  const d = await db();
  const [org] = await d.select().from(organizations).where(eq(organizations.id, orgId));
  await joinSchoolWithCode(t.id, org.joinCode);
  if (opts.approve) await decideMembership({ teacherId: null, email: "studio", orgId: null }, t.id, true);
  const [fresh] = await d.select().from(teachers).where(eq(teachers.id, t.id));
  return fresh;
}

export const principal = (t: { id: string; orgId: string | null }): Principal => ({ kind: "teacher", teacherId: t.id, orgId: t.orgId });

export async function kit(slug: string) {
  const d = await db();
  const [k] = await d.select().from(kits).where(eq(kits.slug, slug));
  return k;
}

export async function content(slug: string) {
  const d = await db();
  const [c] = await d.select().from(contentItems).where(eq(contentItems.slug, slug));
  return c;
}

export async function codesFor(kitSlug: string, quantity = 1) {
  const k = await kit(kitSlug);
  const { codes } = await createOrder({ teacherId: null, email: "support@curiocrate.test" }, { source: "manual", lines: [{ kitId: k.id, quantity }] });
  return codes.map((c) => c.code);
}
