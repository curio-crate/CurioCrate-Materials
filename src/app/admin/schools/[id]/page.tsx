import Link from "next/link";
import { notFound } from "next/navigation";
import { districts, orgDetail } from "@/lib/admin";
import { formatCode } from "@/lib/codes";
import { listKits } from "@/lib/content";
import { grantAction, moveTeacherAction, restoreAction, revokeAction, setDomainAction, setParentAction } from "../../actions";
import styles from "../../admin.module.css";
import { Notice } from "../../Notice";
import { DangerZone } from "./DangerZone";

export const metadata = { title: "School" };

export default async function SchoolPage(props: PageProps<"/admin/schools/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [data, kits, allDistricts] = await Promise.all([orgDetail(id), listKits(), districts()]);
  if (!data) notFound();
  const { org, parent, children, staff, ents, codes, usage, audit } = data;
  const now = new Date();

  return (
    <>
      <Notice sp={sp} />
      <span className="eyebrow">{org.type}</span>
      <h1 className={`h2 ${styles.title}`}>{org.name}</h1>

      <div className={styles.grid2}>
        <div className={`card ${styles.panel}`}>
          <dl className={styles.kv}>
            <dt>Join code</dt>
            <dd className={styles.mono}>{org.joinCode}</dd>
            <dt>District</dt>
            <dd>{parent ? <Link className="link" href={`/admin/schools/${parent.id}`}>{parent.name}</Link> : "—"}</dd>
            {!!children.length && (
              <>
                <dt>Schools</dt>
                <dd>
                  {children.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link className="link" href={`/admin/schools/${c.id}`}>
                        {c.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>Email domain</dt>
            <dd>{org.emailDomain ? `@${org.emailDomain}` : "—"}</dd>
            <dt>Location</dt>
            <dd>{[org.city, org.state].filter(Boolean).join(", ") || "—"}</dd>
            <dt>Video usage</dt>
            <dd>
              {Math.round(usage.seconds / 60)} min across {usage.plays} plays
            </dd>
          </dl>
        </div>
        <div className={`card ${styles.panel}`}>
          <h2 className="h4">Fix access</h2>
          <form action={grantAction} className={styles.form}>
            <input type="hidden" name="orgId" value={org.id} />
            <div className={styles.formRow}>
              <div className="field">
                <label className="label" htmlFor="grant-kit">
                  Grant kit access
                </label>
                <select id="grant-kit" name="kitId" className="select">
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="grant-reason">
                  Reason
                </label>
                <input id="grant-reason" name="reason" className="input" placeholder="Lost code, PO #…" required />
              </div>
            </div>
            <button className="btn btn-outline btn-sm">Grant access</button>
          </form>
          <form action={moveTeacherAction} className={styles.form}>
            <input type="hidden" name="orgId" value={org.id} />
            <div className="field">
              <label className="label" htmlFor="move-email">
                Move a teacher into this school
              </label>
              <input id="move-email" name="email" type="email" className="input" placeholder="teacher@school.org" required />
            </div>
            <button className="btn btn-sm">Move teacher</button>
          </form>
          {org.type === "school" && (
            <form action={setParentAction} className={styles.form}>
              <input type="hidden" name="orgId" value={org.id} />
              <div className="field">
                <label className="label" htmlFor="parent">
                  District
                </label>
                <select id="parent" name="parentId" className="select" defaultValue={org.parentId ?? ""}>
                  <option value="">No district</option>
                  {allDistricts.map((dd) => (
                    <option key={dd.id} value={dd.id}>
                      {dd.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-sm">Save district</button>
            </form>
          )}
          <form action={setDomainAction} className={styles.form}>
            <input type="hidden" name="orgId" value={org.id} />
            <div className="field">
              <label className="label" htmlFor="domain">
                Verified email domain
              </label>
              <input id="domain" name="domain" className="input" defaultValue={org.emailDomain ?? ""} placeholder="school.org" />
            </div>
            <button className="btn btn-sm">Save domain</button>
          </form>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="ents">
        <h2 id="ents" className="h3">
          Access (entitlements)
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Source</th>
                <th scope="col">Since</th>
                <th scope="col">Ends</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {ents.map(({ e, kitName }) => {
                const active = !e.revokedAt && (!e.endsAt || e.endsAt > now);
                return (
                  <tr key={e.id}>
                    <td>{e.kind === "kit" ? kitName : `Subscription (${e.plan ?? "plan"})${e.teacherId ? " · individual" : ""}`}</td>
                    <td>{e.source}</td>
                    <td>{e.startsAt.toLocaleDateString()}</td>
                    <td>{e.endsAt ? e.endsAt.toLocaleDateString() : "Never"}</td>
                    <td className={active ? styles.status_redeemed : styles.status_void}>{e.revokedAt ? `Revoked: ${e.revokedReason ?? ""}` : active ? "Active" : "Ended"}</td>
                    <td>
                      {e.revokedAt ? (
                        <form action={restoreAction}>
                          <input type="hidden" name="orgId" value={org.id} />
                          <input type="hidden" name="entitlementId" value={e.id} />
                          <button className="btn btn-xs">Restore</button>
                        </form>
                      ) : (
                        <form action={revokeAction} className={styles.inline}>
                          <input type="hidden" name="orgId" value={org.id} />
                          <input type="hidden" name="entitlementId" value={e.id} />
                          <label className="sr-only" htmlFor={`rev-${e.id}`}>
                            Reason
                          </label>
                          <input id={`rev-${e.id}`} name="reason" className="input" placeholder="Reason" required />
                          <button className="btn btn-xs btn-danger">Revoke</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!ents.length && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No access yet. Free content only.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="staff">
        <h2 id="staff" className="h3">
          Teachers ({staff.length})
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.membership === "pending" ? <Link className="link" href={`/admin/access?email=${encodeURIComponent(t.email)}`}>Waiting for approval</Link> : t.isOrgAdmin ? "School admin" : "Teacher"}</td>
                  <td>{t.lastSeenAt?.toLocaleDateString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!!codes.length && (
        <section className={styles.section} aria-labelledby="codes">
          <h2 id="codes" className="h3">
            Codes redeemed
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Redeemed</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.mono}>{formatCode(c.code)}</td>
                    <td>{c.redeemedAt?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.section} aria-labelledby="audit">
        <h2 id="audit" className="h3">
          Recent activity
        </h2>
        <ul className="stack" style={{ gap: 6 }}>
          {audit.map((a) => (
            <li key={a.id} className="hint">
              <span className="mono">{a.createdAt.toLocaleString()}</span> · {a.action} · {a.actorEmail ?? "system"}
            </li>
          ))}
          {!audit.length && <li className="hint">No activity yet.</li>}
        </ul>
      </section>

      <DangerZone orgId={org.id} orgName={org.name} />
    </>
  );
}
