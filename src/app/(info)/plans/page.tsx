import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { getViewer } from "@/lib/auth/viewer";
import { features } from "@/lib/features";
import { PLANS } from "@/lib/plans";
import styles from "../info.module.css";
import { PlanCta } from "./PlanCta";

export const metadata: Metadata = { title: "Plans", description: "Free, kit owner and subscription access to Curiocrate Materials." };

export default async function PlansPage(props: PageProps<"/plans">) {
  const sp = await props.searchParams;
  const v = await getViewer();
  return (
    <div className="container">
      <PageHead
        eyebrow="Plans"
        title="Start free."
        accent="Grow into everything."
        lead="Kit access comes free with every physical kit and never expires. A subscription adds every kit's online materials, teacher training, new content and Curie.AI."
      />
      {sp.status === "success" && (
        <p className="alert alert-success" role="status" style={{ marginBottom: 24 }}>
          Payment received. Your subscription is active. It can take a few seconds to appear on your dashboard.
        </p>
      )}
      <ul className={styles.grid3}>
        {PLANS.map((p) => (
          <li key={p.id} className={`card ${styles.plan} ${p.featured ? styles.planFeatured : ""}`}>
            <span className="badge badge-sub">{p.name}</span>
            <p className={styles.price}>
              ${p.priceYear.toLocaleString()} <small>/ year</small>
            </p>
            <p className="muted">{p.who}</p>
            <ul className={styles.list}>
              {p.includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div style={{ marginTop: "auto" }}>
              {features.subscriptions ? (
                <PlanCta planId={p.id} signedIn={!!v} hasSchool={!!v?.org} />
              ) : (
                <a href={`mailto:contact@curiocrate.org?subject=${encodeURIComponent(`${p.name} subscription`)}`} className="btn btn-outline btn-block">
                  Contact us
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      <section className={`card ${styles.block} ${styles.section}`} aria-labelledby="po">
        <h2 id="po" className="h3">
          Paying by purchase order?
        </h2>
        <p className="muted">
          Districts can pay by purchase order or through a distributor. Email{" "}
          <a className="link" href="mailto:contact@curiocrate.org">
            contact@curiocrate.org
          </a>{" "}
          with your PO and we&apos;ll set up access the same day. Already bought a kit? <Link className="link" href="/redeem">Redeem its code</Link>.
        </p>
      </section>
    </div>
  );
}
