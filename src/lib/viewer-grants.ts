import "server-only";
import { cache } from "react";
import type { RowState } from "@/components/content/ContentBits";
import { activeGrants, decide, type Grants, type Principal } from "./access";
import { getCompanyAdmin } from "./auth/admin";
import { getViewer } from "./auth/viewer";
import type { ContentItem } from "./content";
import { principalFor } from "./principal";

/** The current viewer's principal and active grants (cached per request) for rendering lock states. */
export const viewerAccess = cache(async () => {
  const v = await getViewer();
  const principal: Principal = !v && (await getCompanyAdmin()) ? { kind: "teacher", teacherId: "company", orgId: null, isStaff: true } : principalFor(v);
  const grants: Grants = await activeGrants(principal);
  return {
    viewer: v,
    principal,
    grants,
    state(item: Pick<ContentItem, "id" | "kitId" | "requiredTier">): RowState {
      const d = decide(item, principal, grants);
      return d.allowed ? "open" : d.reason === "sign_in" ? "signin" : "locked";
    },
  };
});
