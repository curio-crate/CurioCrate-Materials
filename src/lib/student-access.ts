import "server-only";
import { checkAccess, type Decision } from "./access";
import { currentStudent, isAssigned } from "./classes";
import type { ContentItem } from "./content";

/**
 * A student (class-code session) may open content that their teacher assigned to the class (or a resource
 * inside an assigned lesson), and only while the teacher's own access allows it.
 */
export async function studentAccess(
  content: ContentItem,
): Promise<null | { ok: true; decision: Extract<Decision, { allowed: true }>; orgId: string | null; classId: string } | { ok: false; reason: string }> {
  const st = await currentStudent();
  if (!st) return null;
  const ids = [content.id, ...(content.parentId ? [content.parentId] : [])];
  if (!(await isAssigned(st.c.id, ids))) return { ok: false, reason: "not_assigned" };
  const decision = await checkAccess({ kind: "teacher", teacherId: st.teacher.id, orgId: st.teacher.orgId }, content);
  if (!decision.allowed) return { ok: false, reason: decision.reason };
  return { ok: true, decision, orgId: st.teacher.orgId, classId: st.c.id };
}
