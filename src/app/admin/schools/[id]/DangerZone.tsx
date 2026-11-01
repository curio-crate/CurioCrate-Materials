import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { deleteOrganizationData } from "@/lib/privacy";
import styles from "../../admin.module.css";

async function deleteAction(form: FormData) {
  "use server";
  const actor = await requireAdmin("erase");
  const orgId = String(form.get("orgId"));
  if (String(form.get("confirm")).trim() !== String(form.get("name")).trim()) redirect(`/admin/schools/${orgId}?err=${encodeURIComponent("Type the exact name to confirm.")}`);
  const r = await deleteOrganizationData(actor, orgId);
  redirect(`/admin/schools?ok=${encodeURIComponent(`Deleted all data for ${r.orgs} school(s) and ${r.teachers} teacher(s).`)}`);
}

export function DangerZone({ orgId, orgName }: { orgId: string; orgName: string }) {
  return (
    <section className={`card ${styles.panel} ${styles.section}`} aria-labelledby="danger-h" style={{ borderStyle: "dashed" }}>
      <h2 id="danger-h" className="h3">Contract ended: delete this school&apos;s data</h2>
      <p className="hint">Permanently deletes teachers, classes, student sessions, lab results, Curie.AI chats, access and usage for {orgName} (and its schools, if it is a district). Orders are kept for accounting without customer details.</p>
      <form action={deleteAction} className={styles.inline}>
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="name" value={orgName} />
        <label className="sr-only" htmlFor="confirm-del">Type the school name to confirm</label>
        <input id="confirm-del" name="confirm" className="input" placeholder={orgName} style={{ width: 260 }} />
        <button className="btn btn-sm btn-danger">Delete all data</button>
      </form>
    </section>
  );
}
