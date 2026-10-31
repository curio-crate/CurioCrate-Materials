import "server-only";
import type { Principal } from "./access";
import { getViewer, type TeacherViewer } from "./auth/viewer";

export function principalFor(v: TeacherViewer | null): Principal {
  return v ? { kind: "teacher", teacherId: v.teacher.id, orgId: v.org?.id ?? null, isStaff: v.isStaff } : { kind: "anonymous" };
}

export async function currentPrincipal(): Promise<Principal> {
  return principalFor(await getViewer());
}
