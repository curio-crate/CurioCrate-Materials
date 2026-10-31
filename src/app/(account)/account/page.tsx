import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { accountData, deleteTeacherAccount } from "@/lib/account";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { requireTeacher } from "@/lib/auth/viewer";
import styles from "../account.module.css";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const day = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

async function deleteAccountAction(form: FormData) {
  "use server";
  const v = await requireTeacher("/account");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== v.teacher.email.toLowerCase()) redirect(`/account?err=${encodeURIComponent("Type your email address exactly to confirm.")}`);
  await deleteTeacherAccount(v.teacher.id);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?deleted=1");
}

export default async function AccountPage(props: PageProps<"/account">) {
  const sp = await props.searchParams;
  const v = await requireTeacher("/account");
  const data = (await accountData(v.teacher.id))!;
  return (
    <div className="container">
      <div className={styles.wide}>
        <PageHead size="h1" eyebrow="Teachers" title="My account" accent="and data." lead="We keep your account and everything you create until you delete it. You can download a copy at any time." />
        {typeof sp.err === "string" && (
          <p className="alert alert-danger" role="alert">
            {sp.err}
          </p>
        )}
        <section className={`card ${styles.panel}`} aria-labelledby="mine-h" style={{ marginBottom: 24 }}>
          <h2 id="mine-h" className="h3">
            What we store
          </h2>
          <dl className="stack" style={{ gap: 8, marginTop: 12 }}>
            <div>
              <dt className="eyebrow">You</dt>
              <dd>
                {data.profile.name} · {data.profile.email} · member since {day(data.profile.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Signs in with</dt>
              <dd>{data.signIns.map((s) => s.provider[0].toUpperCase() + s.provider.slice(1)).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="eyebrow">School</dt>
              <dd>{data.school ? `${data.school.name}${data.school.schoolAdmin ? " (school admin)" : ""}${data.school.membership === "pending" ? " · waiting for approval" : ""}` : "None yet"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Kits on your account</dt>
              <dd>{data.kitSeats.filter((s) => s.active).map((s) => s.kit).join(", ") || "None redeemed yet"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Classes</dt>
              <dd>{data.classes.length ? data.classes.map((c) => c.name).join(", ") : "None"} (students never have accounts or names)</dd>
            </div>
            <div>
              <dt className="eyebrow">Signed-in devices</dt>
              <dd>{data.signedInDevices} of 3 allowed. Signing in on another device signs out the oldest.</dd>
            </div>
          </dl>
          <a href="/api/account/export" className="btn btn-outline btn-sm" style={{ marginTop: 16 }} download>
            Download my data (JSON)
          </a>
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="del-h">
          <h2 id="del-h" className="h3">
            Delete my account
          </h2>
          <p className="hint">
            This permanently deletes your account, your kit seats, your classes (with their student devices, lab results and Curie.AI chats) and your usage history. Kit codes you redeemed stay used and
            can&apos;t be redeemed again. This can&apos;t be undone.
          </p>
          <form action={deleteAccountAction} className={styles.form}>
            <div className="field">
              <label className="label" htmlFor="confirm">
                Type your email ({v.teacher.email}) to confirm
              </label>
              <input id="confirm" name="confirm" type="email" className="input" autoComplete="off" required />
            </div>
            <button className="btn btn-danger">Delete my account permanently</button>
          </form>
        </section>
      </div>
    </div>
  );
}
