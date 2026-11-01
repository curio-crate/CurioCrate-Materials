import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { organizations, type teachers } from "@/db/schema";
import { getCompanyAdmin } from "./admin";
import { can, type StudioPerm, type StudioRole } from "./roles";
import { SESSION_COOKIE, teacherForSession } from "./session";

export type Teacher = typeof teachers.$inferSelect;
export type Org = typeof organizations.$inferSelect;
export type TeacherViewer = {
  teacher: Teacher;
  org: Org | null;
  district: Org | null;
  isStaff: boolean;
  isDistrictAdmin: boolean;
};

/** Teachers whose role was set to support/admin in the database can preview all content. This never opens Studio. */
export function isStaffTeacher(t: Pick<Teacher, "role" | "email">) {
  return t.role === "support" || t.role === "admin";
}

/** The signed-in teacher for this request (cached per request), or null. */
export const getViewer = cache(async (): Promise<TeacherViewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const row = await teacherForSession(token);
  if (!row) return null;
  let district: Org | null = null;
  if (row.org?.type === "district") district = row.org;
  else if (row.org?.parentId) {
    const d = await db();
    [district] = await d.select().from(organizations).where(eq(organizations.id, row.org.parentId));
  }
  return {
    teacher: row.teacher,
    org: row.org,
    district: district ?? null,
    isStaff: isStaffTeacher(row.teacher),
    isDistrictAdmin: !!district && row.org?.id === district.id && row.teacher.isOrgAdmin,
  };
});

export async function requireTeacher(next: string) {
  const v = await getViewer();
  if (!v) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return v;
}

export async function requireSchool(next: string) {
  const v = await requireTeacher(next);
  if (!v.org) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return v as TeacherViewer & { org: Org };
}

/**
 * Studio (company side): ONLY a signed-in Studio account (username + password). Every Studio page, server action
 * and route handler calls this; src/proxy.ts also turns away requests without a valid Studio cookie first.
 * With a permission, the account's role must also allow it (see roles.ts); otherwise it goes back to Studio home.
 * Returns the audit actor.
 */
export async function requireAdmin(perm?: StudioPerm): Promise<{ teacherId: null; email: string; adminId: string; role: StudioRole }> {
  const admin = await getCompanyAdmin();
  if (!admin) redirect("/company/login");
  if (perm && !can(admin.role, perm)) redirect("/admin?denied=1");
  return { teacherId: null, email: admin.username, adminId: admin.id, role: admin.role };
}

/** For Studio route handlers: the actor when signed in AND allowed, else null (the route answers 401/403). */
export async function studioActor(perm: StudioPerm) {
  const admin = await getCompanyAdmin();
  if (!admin || !can(admin.role, perm)) return null;
  return { teacherId: null, email: admin.username, adminId: admin.id, role: admin.role };
}

export async function isAdmin(perm?: StudioPerm) {
  const admin = await getCompanyAdmin();
  return !!admin && (!perm || can(admin.role, perm));
}
