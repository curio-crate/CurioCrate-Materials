import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { getViewer } from "@/lib/auth/viewer";
import { RedeemForm } from "./RedeemForm";
import styles from "./redeem.module.css";

export const metadata: Metadata = { title: "Redeem a kit code" };

export default async function RedeemPage(props: PageProps<"/redeem">) {
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code : "";
  const v = await getViewer();
  const next = `/redeem${code ? `?code=${encodeURIComponent(code)}` : ""}`;

  return (
    <div className="container">
      <div className={styles.layout}>
        <div className={styles.intro}>
          <PageHead eyebrow="Kit code" size="h1" title="Unlock your kit" accent="on your account." lead="Each kit comes with a one-time code. Redeem it once and the full online version is yours for good. Codes are tied to the teacher who redeems them, so they can't be shared." />
          <BoxLid />
        </div>
        <div className={styles.formCol}>
          {v && v.org ? (
            <RedeemForm initialCode={code} />
          ) : (
            <div className={`card ${styles.form}`}>
              <span className="eyebrow">Step 1 of 2</span>
              <h2 className="h3">{v ? "Choose your school first" : "Sign in with your school account"}</h2>
              <p className="hint">
                {v
                  ? "Tell us which school you teach at first. Your code will be waiting."
                  : "Codes unlock access for one teacher's account, so we need to know who you are. Your code will be kept."}
              </p>
              {code && (
                <p className="alert">
                  Code ready: <span className="mono">{code.toUpperCase()}</span>
                </p>
              )}
              <Link href={v ? `/onboarding?next=${encodeURIComponent(next)}` : `/signin?next=${encodeURIComponent(next)}`} className="btn btn-solid btn-lg btn-block">
                {v ? "Choose my school →" : "Teacher sign in →"}
              </Link>
            </div>
          )}
          <p className={`hint ${styles.help}`}>
            Lost the code, or it says it was used? Email{" "}
            <a className="link" href="mailto:contact@curiocrate.org">
              contact@curiocrate.org
            </a>{" "}
            with your order or purchase order number and we&apos;ll reissue it.
          </p>
        </div>
      </div>
    </div>
  );
}

function BoxLid() {
  return (
    <figure className={styles.lid} aria-label="Where to find the code: inside the kit box lid, next to a QR code">
      <svg viewBox="0 0 320 170" aria-hidden="true" focusable="false">
        <rect x="10" y="20" width="300" height="140" rx="10" className={styles.lidBox} />
        <rect x="26" y="36" width="268" height="108" rx="6" className={styles.lidInner} />
        <rect x="44" y="58" width="64" height="64" rx="4" className={styles.qr} />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => ((r + c) % 2 === 0 || r === c ? <rect key={`${r}${c}`} x={50 + c * 14} y={64 + r * 14} width="10" height="10" className={styles.qrDot} /> : null)),
        )}
        <text x="126" y="80" className={styles.lidLabel}>
          ONLINE KIT CODE
        </text>
        <text x="126" y="106" className={styles.lidCode}>
          LMN-7K3D-Q9TX-2MPR
        </text>
        <text x="126" y="126" className={styles.lidUrl}>
          materials.curiocrate.org/redeem
        </text>
      </svg>
      <figcaption className="hint">Inside the lid: scan the QR code or type the code.</figcaption>
    </figure>
  );
}
