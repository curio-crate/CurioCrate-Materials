import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { isProviderId, isTestMode, PROVIDERS, redirectUri, testIdpAllowed } from "@/lib/auth/providers";
import styles from "../../account.module.css";

export const metadata: Metadata = { title: "Test sign-in", robots: { index: false } };

// Local stand-in for Google / Clever / ClassLink when their keys are not configured.
// Disabled on the production deployment and for any provider that has real keys.
export default async function TestIdpPage(props: PageProps<"/auth/test-idp">) {
  const sp = await props.searchParams;
  const provider = String(sp.provider ?? "");
  if (!isProviderId(provider) || !isTestMode(provider) || !testIdpAllowed()) notFound();
  if (sp.redirect_uri !== redirectUri(provider)) notFound();
  const label = PROVIDERS[provider].label;

  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead center size="h1" eyebrow={`${label} · test mode`} title="Test sign-in" lead={`This page stands in for ${label} because its keys are not set. It never runs on the production site.`} />
        <form action="/api/auth/test-idp" method="post" className={`card ${styles.panel} ${styles.form}`}>
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="state" value={String(sp.state ?? "")} />
          <input type="hidden" name="code_challenge" value={String(sp.code_challenge ?? "")} />
          {sp.error === "email" && (
            <p className="alert alert-danger" role="alert">
              Enter a valid email address.
            </p>
          )}
          <div className="field">
            <label className="label" htmlFor="email">
              Teacher email
            </label>
            <input id="email" name="email" type="email" className="input" required autoComplete="email" placeholder="ms.rivera@school.org" />
          </div>
          <div className="field">
            <label className="label" htmlFor="name">
              Display name
            </label>
            <input id="name" name="name" className="input" autoComplete="name" placeholder="Ms. Rivera" />
          </div>
          <button type="submit" className="btn btn-solid btn-lg">
            Continue as this teacher
          </button>
        </form>
      </div>
    </div>
  );
}
