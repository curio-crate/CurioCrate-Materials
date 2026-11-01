import "server-only";
import { checkAccess, type Decision } from "./access";
import { getContent, type ContentItem } from "./content";
import { getCompanyAdmin } from "./auth/admin";
import { getViewer } from "./auth/viewer";
import { isTeacherOnly } from "./materials";
import { principalFor } from "./principal";
import { studentAccess } from "./student-access";

export type Gate =
  | { ok: true; content: ContentItem; decision: Extract<Decision, { allowed: true }>; who: { orgId: string | null; teacherId: string | null; classId: string | null } }
  | { ok: false; status: 401 | 403 | 404; reason: string };

/**
 * Server-side gate for a content item: the signed-in teacher (access rule) or, for students,
 * an assignment in their class backed by the class teacher's access.
 */
export async function gateContent(slug: string): Promise<Gate> {
  const content = await getContent(slug);
  if (!content) return { ok: false, status: 404, reason: "not_found" };
  const v = await getViewer();
  if (!v && (await getCompanyAdmin())) return { ok: true, content, decision: { allowed: true, via: "staff" }, who: { orgId: null, teacherId: null, classId: null } };
  if (v) {
    const decision = await checkAccess(principalFor(v), content);
    if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
    return { ok: true, content, decision, who: { orgId: v.org?.id ?? null, teacherId: v.teacher.id, classId: null } };
  }
  // Teacher training and teacher manuals are never for students, even inside an assigned lesson.
  if (isTeacherOnly(content.materialKind)) return { ok: false, status: 403, reason: "not_assigned" };
  const student = await studentAccess(content);
  if (student) return student.ok ? { ok: true, content, decision: student.decision, who: { orgId: student.orgId, teacherId: null, classId: student.classId } } : { ok: false, status: 403, reason: student.reason };
  return { ok: false, status: 401, reason: "sign_in" };
}
