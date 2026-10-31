import Link from "next/link";
import { studioContent } from "@/lib/cms";
import { TYPE_LABEL } from "@/lib/content";
import { pendingMembers, teacherAccess } from "@/lib/security";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { grantSeatAction, membershipAction, restoreSeatAction, revokeSeatAction, setTierAction, signOutEverywhereAction, transferSeatAction } from "./actions";

export const metadata = { title: "Access" };

const TIERS = [
  ["free", "Free (any teacher)"],
  ["kit_owner", "Kit owners"],
  ["subscription", "Subscribers"],
] as const;

// The access panel: who can open what. Look up a teacher, change their kits, and set each item's access level.
export default async function AccessPage(props: PageProps<"/admin/access">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email.trim() : "";
  const [found, pending, { kits, items }] = await Promise.all([email ? teacherAccess(email) : null, pendingMembers(), studioContent()]);
  const now = new Date();

  return (
    <>
      <Notice sp={sp} />
      <div className={styles.titleRow}>
        <div>
          <h1 className="h2">Access</h1>
          <p className="hint">Each kit code is a seat for one teacher. School-wide licenses are granted on the school&apos;s page. Every change is live at once and recorded in the audit log.</p>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="lookup-h">
        <h2 id="lookup-h" className="h3">
          Teacher lookup
        </h2>
        <form className={styles.search} role="search" method="get">
          <div className="field">
            <label className="label" htmlFor="email">
              Teacher email
            </label>
            <input id="email" name="email" type="email" className="input" defaultValue={email} placeholder="teacher@school.org" required />
          </div>
          <button className="btn btn-glass">Look up</button>
        </form>
        {email && !found && <p className="alert alert-warning">No teacher with that email has signed in yet.</p>}
        {found && (
          <div className={styles.grid2}>
            <div className={`card ${styles.panel}`}>
              <dl className={styles.kv}>
                <dt>Name</dt>
                <dd>{found.teacher.name}</dd>
                <dt>School</dt>
                <dd>{found.org ? <Link className="link" href={`/admin/schools/${found.org.id}`}>{found.org.name}</Link> : "None yet"}</dd>
                <dt>Membership</dt>
                <dd className={found.teacher.membership === "pending" ? styles.status_active : ""}>
                  {found.teacher.membership === "pending" ? "Waiting for approval" : found.teacher.isOrgAdmin ? "School admin" : "Approved"}
                </dd>
                <dt>Signed-in devices</dt>
                <dd>{found.devices} of 3</dd>
                <dt>Sign-in places (last 20)</dt>
                <dd className={found.places >= 5 ? styles.status_void : ""}>{found.places} different network{found.places === 1 ? "" : "s"}</dd>
              </dl>
              <div className={styles.inline}>
                {found.teacher.membership === "pending" && (
                  <form action={membershipAction}>
                    <input type="hidden" name="teacherId" value={found.teacher.id} />
                    <input type="hidden" name="approve" value="1" />
                    <input type="hidden" name="email" value={email} />
                    <button className="btn btn-xs btn-solid">Approve into school</button>
                  </form>
                )}
                <form action={signOutEverywhereAction}>
                  <input type="hidden" name="teacherId" value={found.teacher.id} />
                  <input type="hidden" name="email" value={email} />
                  <button className="btn btn-xs btn-outline">Sign out everywhere</button>
                </form>
              </div>
            </div>
            <form action={grantSeatAction} className={`card ${styles.panel} ${styles.form}`}>
              <h3 className="h4">Add a kit to this teacher</h3>
              <input type="hidden" name="teacherId" value={found.teacher.id} />
              <input type="hidden" name="email" value={email} />
              <div className={styles.formRow}>
                <div className="field">
                  <label className="label" htmlFor="seat-kit">
                    Kit
                  </label>
                  <select id="seat-kit" name="kitId" className="select">
                    {kits.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="seat-reason">
                    Reason
                  </label>
                  <input id="seat-reason" name="reason" className="input" placeholder="Damaged code, PO #…" required />
                </div>
              </div>
              <button className="btn btn-sm">Add kit</button>
            </form>
          </div>
        )}
        {found && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table">
              <caption className="sr-only">Kits and subscriptions on this teacher&apos;s account</caption>
              <thead>
                <tr>
                  <th scope="col">Kit / plan</th>
                  <th scope="col">Source</th>
                  <th scope="col">Since</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {found.seats.map(({ e, kitName }) => {
                  const active = !e.revokedAt && (!e.endsAt || e.endsAt > now);
                  return (
                    <tr key={e.id}>
                      <td>{e.kind === "kit" ? kitName : `Subscription (${e.plan ?? "plan"})`}</td>
                      <td>{e.source === "redemption" ? "Kit code" : e.source}</td>
                      <td>{e.startsAt.toLocaleDateString()}</td>
                      <td className={active ? styles.status_redeemed : styles.status_void}>{e.revokedAt ? `Revoked: ${e.revokedReason ?? ""}` : active ? "Active" : "Ended"}</td>
                      <td>
                        <div className={styles.inline}>
                          {e.revokedAt ? (
                            <form action={restoreSeatAction}>
                              <input type="hidden" name="entitlementId" value={e.id} />
                              <input type="hidden" name="email" value={email} />
                              <button className="btn btn-xs">Restore</button>
                            </form>
                          ) : (
                            <form action={revokeSeatAction} className={styles.inline}>
                              <input type="hidden" name="entitlementId" value={e.id} />
                              <input type="hidden" name="email" value={email} />
                              <label className="sr-only" htmlFor={`rv-${e.id}`}>
                                Reason
                              </label>
                              <input id={`rv-${e.id}`} name="reason" className="input" placeholder="Reason" required />
                              <button className="btn btn-xs btn-danger">Revoke</button>
                            </form>
                          )}
                          {e.kind === "kit" && (
                            <form action={transferSeatAction} className={styles.inline}>
                              <input type="hidden" name="entitlementId" value={e.id} />
                              <input type="hidden" name="email" value={email} />
                              <label className="sr-only" htmlFor={`tr-${e.id}`}>
                                Move to teacher email
                              </label>
                              <input id={`tr-${e.id}`} name="to" type="email" className="input" placeholder="Move to email" required />
                              <button className="btn btn-xs btn-outline">Move</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!found.seats.length && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No personal kits. They see free content{found.org ? " and anything licensed to their whole school" : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="pending-h">
        <h2 id="pending-h" className="h3">
          Waiting to join a school ({pending.length})
        </h2>
        <p className="hint">Teachers who joined with a school code. Their school admin normally approves them; you can too.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Teacher</th>
                <th scope="col">School</th>
                <th scope="col">Asked</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(({ t, orgName }) => (
                <tr key={t.id}>
                  <td>
                    {t.name} <span className="hint">{t.email}</span>
                  </td>
                  <td>{orgName}</td>
                  <td className="hint">{t.createdAt.toLocaleDateString()}</td>
                  <td>
                    <div className={styles.inline}>
                      <form action={membershipAction}>
                        <input type="hidden" name="teacherId" value={t.id} />
                        <input type="hidden" name="approve" value="1" />
                        <input type="hidden" name="anchor" value="pending-h" />
                        <button className="btn btn-xs btn-solid" aria-label={`Approve ${t.email}`}>
                          Approve
                        </button>
                      </form>
                      <form action={membershipAction}>
                        <input type="hidden" name="teacherId" value={t.id} />
                        <input type="hidden" name="approve" value="0" />
                        <input type="hidden" name="anchor" value="pending-h" />
                        <button className="btn btn-xs btn-danger" aria-label={`Remove ${t.email}`}>
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!pending.length && (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    Nobody is waiting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="content-h">
        <h2 id="content-h" className="h3">
          Who can open each item
        </h2>
        {[...kits.map((k) => ({ id: k.id as string | null, name: k.name })), { id: null, name: "Professional learning (no kit)" }].map((g) => {
          const rows = items.filter((i) => i.kitId === g.id);
          if (!rows.length) return null;
          return (
            <div key={g.id ?? "none"} style={{ marginBottom: 24 }}>
              <h3 className="h4">{g.name}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Type</th>
                      <th scope="col">Who can open it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link className="link" href={`/admin/content/${c.id}`}>
                            {c.title}
                          </Link>
                        </td>
                        <td>{TYPE_LABEL[c.type]}</td>
                        <td>
                          <form action={setTierAction} className={styles.inline}>
                            <input type="hidden" name="contentId" value={c.id} />
                            <input type="hidden" name="title" value={c.title} />
                            <input type="hidden" name="anchor" value="content-h" />
                            <label className="sr-only" htmlFor={`tier-${c.id}`}>
                              Who can open {c.title}
                            </label>
                            <select id={`tier-${c.id}`} name="tier" className="select" defaultValue={c.requiredTier}>
                              {TIERS.map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button className="btn btn-xs">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
