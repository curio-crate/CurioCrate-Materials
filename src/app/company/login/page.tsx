import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCompanyAdmin } from "@/lib/auth/admin";
import { STUDIO_THEME_COOKIE, studioTheme } from "@/lib/auth/roles";
import "../../admin/studio.css";

export const metadata: Metadata = { title: "Studio sign in · Curiocrate", robots: { index: false } };

export default async function CompanyLogin(props: PageProps<"/company/login">) {
  if (await getCompanyAdmin()) redirect("/admin");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const theme = studioTheme((await cookies()).get(STUDIO_THEME_COOKIE)?.value);
  return (
    <div className="studio" data-theme={theme} style={{ display: "block" }}>
      <main id="main" className="st-login" tabIndex={-1}>
        <div className="st-loginCard">
          <div className="st-brand" style={{ padding: 0 }}>
            <Image src="/brand/cclogosmall.png" alt="" width={34} height={34} unoptimized />
            <span>
              <span className="st-brandName">CurioCrate</span>
              <span className="st-brandTag">Studio</span>
            </span>
          </div>
          <h1 className="st-title" style={{ fontSize: "1.9rem", marginTop: 24 }}>
            Sign in to Studio
          </h1>
          <p className="st-sub">For the Curiocrate team. Teachers sign in on the teacher site.</p>
          <form action="/api/company/login" method="post">
            {error && (
              <p className="alert alert-danger" role="alert">
                {error}
              </p>
            )}
            <div className="field">
              <label className="label" htmlFor="username">
                Email or username
              </label>
              <input id="username" name="username" className="input" required autoComplete="username" autoFocus />
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
          <p className="hint" style={{ marginTop: 20, textAlign: "center" }}>
            <Link className="link" href="/signin">
              Teacher sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
