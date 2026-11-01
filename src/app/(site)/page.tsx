import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { features } from "@/lib/features";
import styles from "./home.module.css";

const STEPS = [
  {
    n: "01",
    title: "Open the box",
    text: "Every kit has a one-time code inside the lid, with a QR code that opens this site with the code filled in.",
  },
  {
    n: "02",
    title: "Redeem on your account",
    text: "Sign in with Google and redeem. The kit's lessons, guides and videos are yours for good.",
  },
  {
    n: "03",
    title: "Teach it",
    text: "Interactive lessons, teacher guides and captioned videos. Students join with a class code, no accounts.",
  },
];

// The one place on the site that points to the demo.
const DEMO_HREF = features.labs ? "/labs/luminol-limit" : "/lessons/luminol-a0-predict";

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroInner}`}>
          <p className={`${styles.ngssLine} rise`}>
            <Icon name="ngss" size={15} /> NGSS-aligned science kits · Grades 4–10
          </p>
          <h1 id="hero-title" className={`display ${styles.heroTitle} rise-2`}>
            Every kit, <br />
            <span className="italic-accent">online and ready.</span>
          </h1>
          <p className={`subtitle ${styles.heroSub} rise-3`}>Lessons, teacher guides, videos and training for your Curiocrate kits.</p>
          <div className={`${styles.heroCtas} rise-4`}>
            <Link href="/catalog" className="btn btn-glass">
              Browse the catalog
            </Link>
            <Link href="/redeem" className="btn">
              Redeem a kit code
            </Link>
          </div>
          {features.classes && (
            <p className={`${styles.heroNote} rise-4`}>
              Student? <Link href="/join">Join your class →</Link>
            </p>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="eyebrow">How it works</span>
            <h2 id="how-title" className="h2">
              One code in the box. <br />
              <span className="italic-accent">Your kit, unlocked for good.</span>
            </h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNum} aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="h4">{s.title}</h3>
                <p className="small muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="standards-title">
        <div className={`container ${styles.split}`}>
          <div>
            <span className="eyebrow">Standards</span>
            <h2 id="standards-title" className="h2">
              Built on NGSS, <br />
              <span className="italic-accent">lesson by lesson.</span>
            </h2>
          </div>
          <div className={styles.splitBody}>
            <p className="lead">
              Every kit and every lesson lists the NGSS performance expectations, practices and crosscutting concepts it
              covers, so you can see the fit before you teach it.
            </p>
            <ul className={styles.checks}>
              <li>Performance expectations on every lesson</li>
              <li>Search the catalog by NGSS code</li>
              <li>Practices and crosscutting concepts on each kit page</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="demo-title">
        <div className="container">
          <div className={`card card-pad ${styles.demo}`}>
            <div>
              <span className="eyebrow">Try it first</span>
              <h2 id="demo-title" className="h3">
                See a lesson before your kit arrives.
              </h2>
              <p className="small muted">One short demo, open to any teacher.</p>
            </div>
            <Link href={DEMO_HREF} className="btn btn-glass">
              Try our demo
            </Link>
          </div>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="privacy-title">
        <div className="container">
          <div className={styles.privacy}>
            <div>
              <span className="eyebrow">Student privacy</span>
              <h2 id="privacy-title" className="h4">
                No student accounts. No student names.
              </h2>
              <p className="small muted">Students join with a class code. Data is never sold, never used for ads and never used to train AI.</p>
            </div>
            <div className={styles.privacyLinks}>
              <Link href="/privacy" className="text-link">
                Privacy commitments →
              </Link>
              <Link href="/schools/it" className="text-link">
                Domains for IT →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
