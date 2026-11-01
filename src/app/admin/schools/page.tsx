import Link from "next/link";
import { searchOrgs } from "@/lib/admin";
import { createOrgAction } from "../actions";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata = { title: "Schools" };

export default async function SchoolsPage(props: PageProps<"/admin/schools">) {
  await requireAdmin("schools");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await searchOrgs(q);
  return (
    <>
      <Notice sp={sp} />
      <div className={styles.grid2}>
        <section aria-labelledby="schools-title">
          <h1 id="schools-title" className={`h2 ${styles.title}`}>
            Schools &amp; districts
          </h1>
          <form className={styles.search} role="search" method="get">
            <div className="field">
              <label htmlFor="q" className="label">
                Name, email domain or join code
              </label>
              <input id="q" name="q" defaultValue={q} className="input" />
            </div>
            <button type="submit" className="btn btn-glass">
              Search
            </button>
          </form>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Join code</th>
                  <th scope="col">Teachers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ org, teachers }) => (
                  <tr key={org.id}>
                    <td>
                      <Link className="link" href={`/admin/schools/${org.id}`}>
                        {org.name}
                      </Link>
                      {org.emailDomain && <div className="hint">@{org.emailDomain}</div>}
                    </td>
                    <td>{org.type}</td>
                    <td className={styles.mono}>{org.joinCode}</td>
                    <td>{teachers}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className={`card ${styles.panel}`} aria-labelledby="new-org">
          <h2 id="new-org" className="h3">
            Add a school or district
          </h2>
          <form action={createOrgAction} className={styles.form}>
            <div className="field">
              <label className="label" htmlFor="org-name">
                Name
              </label>
              <input id="org-name" name="name" className="input" required />
            </div>
            <div className={styles.formRow}>
              <div className="field">
                <label className="label" htmlFor="org-type">
                  Type
                </label>
                <select id="org-type" name="type" className="select">
                  <option value="school">School</option>
                  <option value="district">District</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="org-state">
                  State
                </label>
                <input id="org-state" name="state" className="input" maxLength={2} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="org-domain">
                Verified email domain (optional)
              </label>
              <input id="org-domain" name="domain" className="input" placeholder="abcusd.org" />
              <p className="hint">Teachers who sign in with this domain join automatically. Only set it after confirming the domain belongs to the school.</p>
            </div>
            <button className="btn btn-solid">Create</button>
          </form>
        </section>
      </div>
    </>
  );
}
