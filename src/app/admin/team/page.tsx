import { Icon } from "@/components/ui/Icon";
import { getCompanyAdmin, listAdmins, MIN_PASSWORD } from "@/lib/auth/admin";
import { asRole, ROLE_BLURB, ROLE_GROUPS, ROLE_LABEL } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { serviceModes } from "@/lib/env";
import styles from "../admin.module.css";
import { Avatar } from "../Avatar";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";
import { createAdminAction, resetPasswordAction, setActiveAction, setRoleAction } from "./actions";

export const metadata = { title: "Team & roles" };

const fmt = (d: Date | null) => (d ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never");

export default async function TeamPage(props: PageProps<"/admin/team">) {
  await requireAdmin("team");
  const sp = await props.searchParams;
  const [me, admins] = await Promise.all([getCompanyAdmin(), listAdmins()]);
  const modes = serviceModes();
  const now = new Date();
  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="Team & roles" sub="Add people by email and give them a role. Studio is password-only; teacher Google accounts can never open it." />

      <section aria-labelledby="people-h">
        <div className="st-sectionHead">
          <h2 id="people-h" className="st-h2">
            People
          </h2>
          <span className="hint">{admins.length} account{admins.length === 1 ? "" : "s"}</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const mine = a.id === me?.id;
                const role = asRole(a.role);
                const locked = a.lockedUntil && a.lockedUntil > now;
                return (
                  <tr key={a.id}>
                    <td>
                      <span className="st-person">
                        <Avatar person={a} size={30} />
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ color: "var(--st-heading)" }}>{a.name}</strong>
                          {mine && <span className="hint"> (you)</span>}
                          <span className="hint" style={{ display: "block" }}>{a.email ?? a.username}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {mine ? (
                        <span className="st-pill">{ROLE_LABEL[role]}</span>
                      ) : (
                        <form action={setRoleAction} className={styles.inline}>
                          <input type="hidden" name="id" value={a.id} />
                          <label className="sr-only" htmlFor={`role-${a.id}`}>
                            Role for {a.name}
                          </label>
                          <select id={`role-${a.id}`} name="role" defaultValue={role} className="select" style={{ minHeight: 34, width: 200 }}>
                            {ROLE_GROUPS.map((g) => (
                              <optgroup key={g.label} label={g.label}>
                                {g.roles.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <button className="btn btn-xs">Save</button>
                        </form>
                      )}
                    </td>
                    <td className="hint">{fmt(a.lastLoginAt)}</td>
                    <td>
                      <span className={`st-pill ${!a.active ? "st-pill-bad" : locked ? "st-pill-warn" : "st-pill-ok"}`}>{!a.active ? "Disabled" : locked ? "Locked" : "Active"}</span>
                    </td>
                    <td>
                      {!mine && (
                        <div className={styles.inline} style={{ justifyContent: "flex-end" }}>
                          <details className="st-details" style={{ margin: 0 }}>
                            <summary>
                              Reset password <Icon name="chevron" size={14} />
                            </summary>
                            <form action={resetPasswordAction} className={styles.inline}>
                              <input type="hidden" name="id" value={a.id} />
                              <label className="sr-only" htmlFor={`pw-${a.id}`}>
                                New password for {a.name}
                              </label>
                              <input id={`pw-${a.id}`} name="password" type="password" className="input" placeholder="New password" minLength={MIN_PASSWORD} autoComplete="new-password" required style={{ minHeight: 34, width: 180 }} />
                              <button className="btn btn-xs">Reset</button>
                            </form>
                          </details>
                          <form action={setActiveAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                            <button className={`btn btn-xs ${a.active ? "btn-danger" : ""}`}>{a.active ? "Disable" : "Enable"}</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="st-section" aria-labelledby="add-h">
        <form action={createAdminAction} className="st-card stack" style={{ gap: 16 }}>
          <div>
            <h2 id="add-h" className="st-h2">
              Add a person
            </h2>
            <p className="hint">They sign in at /company/login with their email and the temporary password, then change it under My account.</p>
          </div>
          <div className="st-fields">
            <div className="field">
              <label className="label" htmlFor="new-email">
                Email
              </label>
              <input id="new-email" name="email" type="email" className="input" required autoComplete="off" placeholder="name@curiocrate.org" />
            </div>
            <div className="field">
              <label className="label" htmlFor="new-name">
                Full name
              </label>
              <input id="new-name" name="name" className="input" required />
            </div>
          </div>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="label" style={{ marginBottom: 8 }}>
              Role
            </legend>
            {ROLE_GROUPS.map((g) => (
              <div key={g.label} className="st-roleGroup">
                <span className="st-roleGroupLabel">{g.label}</span>
                <div className="st-roles">
                  {g.roles.map((r) => (
                    <label key={r} className="st-role">
                      <input type="radio" name="role" value={r} defaultChecked={r === "director_curriculum"} required />
                      <span className="st-roleName">{ROLE_LABEL[r]}</span>
                      <span className="st-roleText">{ROLE_BLURB[r]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <div className="field" style={{ maxWidth: 360 }}>
            <label className="label" htmlFor="new-password">
              Temporary password
            </label>
            <input id="new-password" name="password" type="password" className="input" minLength={MIN_PASSWORD} autoComplete="new-password" required />
            <span className="hint">At least {MIN_PASSWORD} characters. Share it privately.</span>
          </div>
          <div>
            <button className="btn btn-solid">
              <Icon name="plus" size={16} /> Add person
            </button>
          </div>
        </form>
      </section>

      <section className="st-section" aria-labelledby="sys-h">
        <div className="st-sectionHead">
          <h2 id="sys-h" className="st-h2">
            Where data is stored
          </h2>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>
          Everything must say “Cloud” before launch. A deployed site refuses to start without a cloud database and cloud file storage.
        </p>
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
                  <td>
                    <span className={`st-pill ${m.mode === "live" ? "st-pill-ok" : "st-pill-warn"}`}>{m.mode === "live" ? "Cloud" : m.mode === "test" ? "Test mode" : "This computer"}</span>
                  </td>
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
