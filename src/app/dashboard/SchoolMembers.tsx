import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { requireSchool, type Org, type TeacherViewer } from "@/lib/auth/viewer";
import { decideMembership } from "@/lib/teachers";
import styles from "./dashboard.module.css";

async function decideAction(form: FormData) {
  "use server";
  const v = await requireSchool("/dashboard");
  if (!v.teacher.isOrgAdmin || v.teacher.membership !== "active") redirect("/dashboard");
  const approve = form.get("approve") === "1";
  const t = await decideMembership({ teacherId: v.teacher.id, email: v.teacher.email, orgId: v.org.id }, String(form.get("teacherId") ?? ""), approve);
  revalidatePath("/dashboard");
  redirect(`/dashboard?ok=${encodeURIComponent(t ? (approve ? `${t.name} approved.` : `${t.name} removed from your school.`) : "That teacher isn't at your school.")}`);
}

/** School admins approve colleagues who joined with the school code. Until then those colleagues get no school-wide access. */
export async function SchoolMembers({ v }: { v: TeacherViewer & { org: Org } }) {
  if (!v.teacher.isOrgAdmin || v.teacher.membership !== "active") return null;
  const d = await db();
  const pending = await d.select().from(teachers).where(and(eq(teachers.orgId, v.org.id), eq(teachers.membership, "pending"))).orderBy(teachers.createdAt);
  if (!pending.length) return null;
  return (
    <section className={`card ${styles.section}`} aria-labelledby="pending-title" style={{ padding: 24 }}>
      <h2 id="pending-title" className="h3">
        Waiting for your approval
      </h2>
      <p className="hint">These teachers joined {v.org.name} with your school code. Approve only people who really teach at your school.</p>
      <ul className="stack" style={{ gap: 10, marginTop: 12 }}>
        {pending.map((t) => (
          <li key={t.id} className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <span>
              <strong>{t.name}</strong> <span className="hint">{t.email}</span>
            </span>
            <span className="row">
              <form action={decideAction}>
                <input type="hidden" name="teacherId" value={t.id} />
                <input type="hidden" name="approve" value="1" />
                <button className="btn btn-xs btn-solid" aria-label={`Approve ${t.name}`}>
                  Approve
                </button>
              </form>
              <form action={decideAction}>
                <input type="hidden" name="teacherId" value={t.id} />
                <input type="hidden" name="approve" value="0" />
                <button className="btn btn-xs btn-danger" aria-label={`Remove ${t.name}`}>
                  Remove
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
