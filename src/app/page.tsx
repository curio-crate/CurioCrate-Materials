import Link from "next/link";
import { KitArt } from "@/components/kit/KitArt";
import { KITS } from "@/content/kits";
import { features } from "@/lib/features";
import styles from "./home.module.css";

const STEPS = [
  {
    n: "01",
    title: "Open the box",
    text: "Every kit has a one-time code printed inside the lid, with a QR code that opens this site with the code filled in.",
  },
  {
    n: "02",
    title: "Redeem once, on your account",
    text: "Sign in with your Google account and redeem. The full online kit is yours for good. Each code is tied to one teacher, so it can't be passed around.",
  },
  {
    n: "03",
    title: "Teach it online and in the room",
    text: "Lessons, teacher guides, captioned videos and browser labs. Students join with a class code. No student accounts.",
  },
];

const TIERS = [
  {
    badge: "badge badge-free",
    name: "Free",
    who: "Any teacher with an account",
    items: ["Kit catalog with NGSS tags", "Sample lessons from every kit", "One online demo lab per kit line"],
    cta: { href: "/catalog", label: "Browse the catalog" },
  },
  {
    badge: "badge badge-kit",
    name: "Kit owner",
    who: "Schools that bought a physical kit",
    items: ["The full online version of that kit", "All labs, instructions and videos", "Teacher guide and assessments", "Never expires"],
    cta: { href: "/redeem", label: "Redeem a kit code" },
  },
  {
    badge: "badge badge-sub",
    name: "Subscription",
    who: "Teachers, schools and districts",
    items: ["Every kit's online materials", "Teacher training courses", "New content as it ships", "Curie.AI class helper"],
    cta: { href: "/plans", label: "See plans" },
  },
];

export default function HomePage() {
  const luminol = KITS[0];
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroInner}`}>
          <Link href="/kits/luminol" className={`${styles.pill} rise`}>
            The Luminol Forensics Kit is online <span aria-hidden="true">→</span>
          </Link>
          <h1 id="hero-title" className={`display ${styles.heroTitle} rise-2`}>
            Every kit, <br />
            <span className="italic-accent">online and ready.</span>
          </h1>
          <p className={`subtitle ${styles.heroSub} rise-3`}>
            Labs, lessons, videos and teacher training for Curiocrate kits. Grades 4–10.
          </p>
          <div className={`${styles.heroCtas} rise-4`}>
            <Link href="/catalog" className="btn btn-glass">
              Browse the catalog
            </Link>
            <Link href="/redeem" className="btn">
              Redeem a kit code
            </Link>
            {features.classes ? (
              <Link href="/join" className="btn">
                Students: join a class
              </Link>
            ) : (
              <Link href="/signin" className="btn">
                Teacher sign in
              </Link>
            )}
          </div>
        </div>
        <dl className={`${styles.stats} container`}>
          <div>
            <dt className="eyebrow">Grades</dt>
            <dd>4–10</dd>
          </div>
          <div>
            <dt className="eyebrow">Kit lines</dt>
            <dd>{KITS.length}</dd>
          </div>
          <div>
            <dt className="eyebrow">Student accounts</dt>
            <dd>Zero</dd>
          </div>
          <div>
            <dt className="eyebrow">Videos captioned</dt>
            <dd>100%</dd>
          </div>
        </dl>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="eyebrow">How kit access works</span>
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

      <section className="section-tight" aria-labelledby="feature-title">
        <div className="container">
          <div className={`feature-card ${styles.feature}`}>
            <div className={styles.featureCopy}>
              <span className="badge badge-kit">{luminol.gradeBand} · Kit online</span>
              <h2 id="feature-title" className={`kit-title ${styles.featureTitle}`}>
                Solve a museum break-in with a real glow test.
              </h2>
              <p className={styles.featureText}>
                Six manual sections, from a first prediction to an evidence-based verdict. Try the serial-dilution lab
                free, then unlock the full case with the code in your kit.
              </p>
              <div className="row">
                <Link href={features.labs ? "/labs/luminol-limit" : "/lessons/luminol-a0-predict"} className="btn btn-kit">
                  {features.labs ? "Open the free lab" : "Try the free lesson"}
                </Link>
                <Link href="/kits/luminol" className="btn btn-kit-ghost">
                  See the online kit →
                </Link>
              </div>
            </div>
            <div className={styles.featureArt}>
              <KitArt kit="luminol" />
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="tiers-title">
        <div className="container">
          <div className={`${styles.sectionHead} ${styles.center}`}>
            <span className="eyebrow">Access</span>
            <h2 id="tiers-title" className="h2">
              Start free. <span className="italic-accent">Unlock with your kit.</span>
            </h2>
          </div>
          <ul className={styles.tiers}>
            {TIERS.map((t) => (
              <li key={t.name} className={`card ${styles.tier}`}>
                <span className={t.badge}>{t.name}</span>
                <p className={styles.tierWho}>{t.who}</p>
                <ul className={styles.tierList}>
                  {t.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <Link href={t.cta.href} className="text-link">
                  {t.cta.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="curie-title">
        <div className={`container ${styles.split}`}>
          <div>
            <span className="eyebrow">Curie.AI · optional</span>
            <h2 id="curie-title" className="h2">
              A lab partner <br />
              <span className="italic-accent">that asks back.</span>
            </h2>
          </div>
          <div className={styles.splitBody}>
            <p className="lead">
              Curie gives hints, not answers, and stays on the lesson your class is doing. It is off until you turn it
              on for a class, and you can read every conversation.
            </p>
            <ul className={styles.checks}>
              <li>Off by default, on per class</li>
              <li>Age-appropriate filtering on every message</li>
              <li>Daily limit per class</li>
              <li>Chats deleted on a schedule, never used for AI training</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-tight" aria-labelledby="privacy-title">
        <div className="container">
          <div className={`card card-pad ${styles.privacy}`}>
            <div>
              <span className="eyebrow">Student privacy</span>
              <h2 id="privacy-title" className="h3">
                No student accounts. No student names.
              </h2>
              <p className="small muted">
                Students join with a class code. Teacher and student data is never sold, never used for ads and never
                used to train AI. A school&apos;s data can be fully deleted when its contract ends.
              </p>
            </div>
            <div className={styles.privacyLinks}>
              <Link href="/privacy" className="btn btn-outline btn-sm">
                Privacy commitments
              </Link>
              <Link href="/schools/it" className="btn btn-sm">
                Domains for IT
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
