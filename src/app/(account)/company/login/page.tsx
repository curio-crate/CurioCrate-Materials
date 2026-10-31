import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { getCompanyAdmin } from "@/lib/auth/admin";
import styles from "../../account.module.css";

export const metadata: Metadata = { title: "Company login", robots: { index: false } };

export default async function CompanyLogin(props: PageProps<"/company/login">) {
  if (await getCompanyAdmin()) redirect("/admin/files");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead center size="h1" eyebrow="Curiocrate Studio" title="Company" accent="sign in." lead="For the Curiocrate team: upload PDFs and files, build lessons and videos, and generate kit codes. Teachers sign in on the teacher page." />
        <form action="/api/company/login" method="post" className={`card ${styles.panel} ${styles.form}`}>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input id="username" name="username" className="input" required autoComplete="username" />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-solid btn-lg">
            Sign in to Studio
          </button>
        </form>
      </div>
    </div>
  );
}
