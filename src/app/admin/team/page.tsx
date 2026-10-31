import { getCompanyAdmin, listAdmins, MIN_PASSWORD } from "@/lib/auth/admin";
import { serviceModes } from "@/lib/env";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { changeOwnPasswordAction, createAdminAction, resetPasswordAction, setActiveAction } from "./actions";

export const metadata = { title: "Team" };

const fmt = (d: Date | null) => (d ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never");

export default async function TeamPage(props: PageProps<"/admin/team">) {
  const sp = await props.searchParams;
  const [me, admins] = await Promise.all([getCompanyAdmin(), listAdmins()]);
  const modes = serviceModes();
  const now = new Date();
  return (
    <>
      <Notice sp={sp} />
      <div className={styles.titleRow}>
        <div>
          <h1 className="h2">Team &amp; system</h1>
          <p className="hint">Studio accounts sign in with a username and password only. Teacher Google accounts can never open Studio.</p>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="accounts-h">
        <h2 id="accounts-h" className="h3">
          Studio accounts
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Name</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className={styles.mono}>
                    {a.username}
                    {a.id === me?.id && <span className="hint"> (you)</span>}
                  </td>
                  <td>{a.name}</td>
                  <td className="hint">{fmt(a.lastLoginAt)}</td>
                  <td className={a.active ? styles.status_redeemed : styles.status_void}>{!a.active ? "Disabled" : a.lockedUntil && a.lockedUntil > now ? "Locked (too many wrong passwords)" : "Active"}</td>
                  <td>
                    <div className={styles.inline}>
                      {a.id !== me?.id && (
                        <form action={setActiveAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                          <button className={`btn btn-xs ${a.active ? "btn-danger" : ""}`}>{a.active ? "Disable" : "Enable"}</button>
                        </form>
                      )}
                      {a.id !== me?.id && (
                        <form action={resetPasswordAction} className={styles.inline}>
                          <input type="hidden" name="id" value={a.id} />
                          <label className="sr-only" htmlFor={`pw-${a.id}`}>
                            New password for {a.username}
                          </label>
                          <input id={`pw-${a.id}`} name="password" type="password" className="input" placeholder="New password" minLength={MIN_PASSWORD} autoComplete="new-password" required />
                          <button className="btn btn-xs btn-outline">Reset password</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.grid2}>
        <form action={createAdminAction} className={`card ${styles.panel} ${styles.form}`} aria-labelledby="add-h">
          <h2 id="add-h" className="h4">
            Add a Studio account
          </h2>
          <div className={styles.formRow}>
            <div className="field">
              <label className="label" htmlFor="new-username">
                Username
              </label>
              <input id="new-username" name="username" className="input" required pattern="[A-Za-z0-9._\-]{3,40}" autoComplete="off" />
            </div>
            <div className="field">
              <label className="label" htmlFor="new-name">
                Full name
              </label>
              <input id="new-name" name="name" className="input" required />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="new-password">
              Temporary password (at least {MIN_PASSWORD} characters)
            </label>
            <input id="new-password" name="password" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
          </div>
          <button className="btn btn-solid btn-sm">Add account</button>
        </form>

        <form action={changeOwnPasswordAction} className={`card ${styles.panel} ${styles.form}`} aria-labelledby="mine-h">
          <h2 id="mine-h" className="h4">
            Change my password
          </h2>
          <div className="field">
            <label className="label" htmlFor="cur-pw">
              Current password
            </label>
            <input id="cur-pw" name="current" type="password" className="input" autoComplete="current-password" required />
          </div>
          <div className={styles.formRow}>
            <div className="field">
              <label className="label" htmlFor="next-pw">
                New password
              </label>
              <input id="next-pw" name="next" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="confirm-pw">
                Repeat new password
              </label>
              <input id="confirm-pw" name="confirm" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
            </div>
          </div>
          <button className="btn btn-sm">Change password</button>
        </form>
      </div>

      <section className={styles.section} aria-labelledby="sys-h">
        <h2 id="sys-h" className="h3">
          Where data is stored
        </h2>
        <p className="hint">Everything must say “cloud” before launch. A deployed site refuses to start without a cloud database and cloud file storage, so nothing is ever kept on a temporary server disk.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Mode</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {modes.map((m) => (
                <tr key={m.service}>
                  <td>{m.service}</td>
                  <td className={m.mode === "live" ? styles.status_redeemed : styles.status_void}>{m.mode === "live" ? "Cloud / live" : m.mode === "test" ? "Test mode" : "This computer only"}</td>
                  <td className="hint">{m.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
