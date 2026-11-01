import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { getViewer } from "@/lib/auth/viewer";
import { safeNext } from "@/lib/auth/flow";
import { enabledProviders, isTestMode, PROVIDERS } from "@/lib/auth/providers";
import styles from "../account.module.css";

export const metadata: Metadata = { title: "Teacher sign in" };

const ERRORS: Record<string, string> = {
  state: "Your sign-in took too long or was opened in another tab. Please try again.",
  exchange: "We couldn't finish signing you in. Please try again.",
  cancelled: "Sign-in was cancelled.",
  provider: "That sign-in method isn't available.",
};

export default async function SignInPage(props: PageProps<"/signin">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getViewer()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] ?? ERRORS.exchange : null;
  const providers = enabledProviders();
  const anyTest = providers.some(isTestMode);

  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead
          center
          size="h1"
          eyebrow="Teachers"
          title="Sign in to your classroom"
          lead="Use your school account. Your kits, classes and lessons are all in one place."
        />
        <section className={`card ${styles.panel} rise-4`} aria-labelledby="signin-heading">
          <h2 id="signin-heading" className="sr-only">
            Choose how to sign in
          </h2>
          {error && (
            <p className="alert alert-danger" role="alert" style={{ marginBottom: 20 }}>
              {error}
            </p>
          )}
          {!providers.length && (
            <p className="alert alert-warning" role="status">
              Teacher sign-in is being set up. Please check back soon.
            </p>
          )}
          <div className={styles.providers}>
            {providers.map((p) => (
              <a key={p} href={`/api/auth/${p}/start?next=${encodeURIComponent(next)}`} className={styles.provider}>
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static provider icon */}
                <img src={`/icons/${p}.svg`} alt="" width={24} height={24} />
                Continue with {PROVIDERS[p].label}
                {isTestMode(p) && <span className="badge badge-plain badge-sub">Test mode</span>}
                <span className={styles.providerArrow} aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
          <div className={styles.note}>
            {anyTest && (
              <p className="hint">
                Test mode: provider keys are not set, so sign-in uses the local test identity provider. Set the keys in
                the environment to use the real service.
              </p>
            )}
            <p className="hint">
              Are you a student?{" "}
              <Link href="/join" className="link">
                Join your class or sign in here
              </Link>
              .
            </p>
            <p className="hint">
              By continuing you agree to the{" "}
              <Link href="/terms#teachers" className="link">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
