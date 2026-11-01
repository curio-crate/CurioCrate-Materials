import { recentAudit } from "@/lib/admin";
import styles from "../admin.module.css";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin("audit");
  const rows = await recentAudit(100);
  return (
    <>
      <h1 className={`h2 ${styles.title}`}>Audit log</h1>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">School</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, orgName }) => (
              <tr key={a.id}>
                <td className={styles.mono}>{a.createdAt.toLocaleString()}</td>
                <td>{a.actorEmail ?? "system"}</td>
                <td>{a.action}</td>
                <td>{orgName ?? "—"}</td>
                <td className="hint">{Object.keys(a.details).length ? JSON.stringify(a.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
