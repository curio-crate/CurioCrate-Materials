import Link from "next/link";
import { findTeacher, platformStats } from "@/lib/admin";
import { formatCode } from "@/lib/codes";
import { lookupCodes } from "@/lib/orders";
import { requireAdmin } from "@/lib/auth/viewer";
import { reissueAction, voidAction } from "../actions";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";

export const metadata = { title: "Code lookup" };

export default async function AdminLookup(props: PageProps<"/admin/lookup">) {
  await requireAdmin("codes");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [stats, rows, teacher] = await Promise.all([platformStats(), q ? lookupCodes(q) : Promise.resolve([]), q.includes("@") ? findTeacher(q) : Promise.resolve(null)]);
  const backTo = `/admin/lookup?q=${encodeURIComponent(q)}`;

  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="Code lookup" sub="Find any kit code, order or PO number, customer or teacher email, or school, then reissue or void it." />
      <dl className={styles.stats}>
        {[
          ["Codes issued", stats.codes],
          ["Redeemed", stats.redeemed],
          ["Schools & districts", stats.orgs],
          ["Teachers", stats.teachers],
          ["Video minutes", stats.videoMinutes],
        ].map(([k, n]) => (
          <div key={k} className={styles.stat}>
            <dt>{k}</dt>
            <dd>{n}</dd>
          </div>
        ))}
      </dl>

      <form className={styles.search} role="search" method="get">
        <div className="field">
          <label htmlFor="q" className="label">
            Code, order or PO number, customer or teacher email, or school name
          </label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="LMN-7K3D-… or PO-2026-114 or ms.rivera@school.org" autoFocus />
        </div>
        <button type="submit" className="btn btn-glass">
          Search
        </button>
      </form>

      {teacher && (
        <div className={`card ${styles.panel}`} style={{ marginBottom: 24 }}>
          <h2 className="h4">Teacher: {teacher.t.name}</h2>
          <dl className={styles.kv}>
            <dt>Email</dt>
            <dd>{teacher.t.email}</dd>
            <dt>School</dt>
            <dd>{teacher.t.orgId ? <Link className="link" href={`/admin/schools/${teacher.t.orgId}`}>{teacher.orgName}</Link> : "No school yet"}</dd>
            <dt>Role</dt>
            <dd>{teacher.t.role}</dd>
          </dl>
        </div>
      )}

      {q && (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Codes matching {q}</caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Kit</th>
                <th scope="col">Status</th>
                <th scope="col">Order</th>
                <th scope="col">Redeemed by</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code.id}>
                  <td className={styles.mono}>{formatCode(r.code.code)}</td>
                  <td>{r.kitName}</td>
                  <td className={styles[`status_${r.code.status}`]}>
                    {r.code.status}
                    {r.code.voidReason ? ` (${r.code.voidReason})` : ""}
                  </td>
                  <td>
                    <Link className="link" href={`/admin/orders/${r.order.id}`}>
                      {r.order.reference ?? r.order.source}
                    </Link>
                    {r.order.customerName ? <div className="hint">{r.order.customerName}</div> : null}
                  </td>
                  <td>
                    {r.code.redeemedOrgId ? (
                      <>
                        <Link className="link" href={`/admin/schools/${r.code.redeemedOrgId}`}>
                          {r.orgName}
                        </Link>
                        <div className="hint">
                          {r.redeemedBy} · {r.code.redeemedAt?.toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {r.code.status === "active" ? (
                      <div className={styles.inline}>
                        <form action={reissueAction} className={styles.inline}>
                          <input type="hidden" name="codeId" value={r.code.id} />
                          <input type="hidden" name="back" value={backTo} />
                          <label className="sr-only" htmlFor={`reason-${r.code.id}`}>
                            Reason for reissue
                          </label>
                          <input id={`reason-${r.code.id}`} name="reason" className="input" placeholder="Reason (lost…)" />
                          <button className="btn btn-xs btn-outline">Reissue</button>
                        </form>
                        <form action={voidAction}>
                          <input type="hidden" name="codeId" value={r.code.id} />
                          <input type="hidden" name="back" value={backTo} />
                          <button className="btn btn-xs btn-danger">Void</button>
                        </form>
                      </div>
                    ) : r.code.status === "redeemed" ? (
                      <Link className="text-link" href={`/admin/schools/${r.code.redeemedOrgId}`}>
                        Fix access →
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No codes match &ldquo;{q}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
