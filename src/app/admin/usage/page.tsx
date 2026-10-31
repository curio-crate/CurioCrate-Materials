import Link from "next/link";
import { streamingUsageByOrg } from "@/lib/admin";
import styles from "../admin.module.css";

export const metadata = { title: "Streaming usage" };

export default async function UsagePage() {
  const rows = await streamingUsageByOrg();
  const total = rows.reduce((n, r) => n + r.minutes, 0);
  return (
    <>
      <h1 className={`h2 ${styles.title}`}>Streaming usage by school</h1>
      <p className="lead" style={{ marginBottom: 24 }}>
        {total} minutes watched in total. Minutes come from player heartbeats; plays count each signed playback link issued.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">School</th>
              <th scope="col">Minutes watched</th>
              <th scope="col">Plays</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.orgId ?? "none"}>
                <td>{r.orgId ? <Link className="link" href={`/admin/schools/${r.orgId}`}>{r.name}</Link> : "No school (staff previews)"}</td>
                <td>{r.minutes}</td>
                <td>{r.plays}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  No video plays yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
