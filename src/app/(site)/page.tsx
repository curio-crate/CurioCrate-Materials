import Link from "next/link";
import { KitArt } from "@/components/kit/KitArt";
import { Icon } from "@/components/ui/Icon";
import { MAX_CLASSES_PER_TEACHER, MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { HeroPreview } from "./HeroPreview";
import styles from "./home.module.css";

/*
 * The landing page, read top to bottom in three seconds:
 *   1. What it is (one headline on CurioCrate blue) and the product itself, big.
 *   2. Where to go: one tile per kind of visitor (teachers, students, try it).
 *   3. How it works, then the two promises (standards, privacy).
 */
export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={`${styles.product} rise`}>CurioCrate Materials</p>
          <h1 id="hero-title" className={`${styles.display} rise-2`}>
            Hands-on science, ready to teach.
          </h1>
          <p className={`${styles.heroLead} rise-3`}>Lessons, labs, videos and teacher guides for every CurioCrate kit. NGSS-aligned for grades 4&nbsp;to&nbsp;10.</p>
          <div className={`${styles.ctas} rise-4`}>
            <Link href="/signin" className="btn btn-white btn-lg">
              Teacher sign in
            </Link>
            <Link href="/demo" className="btn btn-on-blue btn-lg">
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      <div className={`container-wide ${styles.productShot} rise-3`}>
        <HeroPreview maxStudents={MAX_STUDENTS_PER_CLASS} />
      </div>

      <section className={`container-wide ${styles.paths}`} aria-label="Where to start">
        <div className={`${styles.tile} reveal`}>
          <span className={styles.tileIcon} aria-hidden="true">
            <Icon name="school" size={26} />
          </span>
          <h2 className={styles.tileTitle}>Teachers</h2>
          <p className={styles.tileText}>Your kits, classes and lessons in one place. Sign in with your school Google, Clever or ClassLink account.</p>
          <div className={styles.tileCtas}>
            <Link href="/signin" className="btn btn-solid">
              Sign in
            </Link>
            <Link href="/redeem" className="btn">
              Redeem a kit code
            </Link>
          </div>
        </div>
        <div className={`${styles.tile} reveal`}>
          <span className={styles.tileIcon} aria-hidden="true">
            <Icon name="users" size={26} />
          </span>
          <h2 className={styles.tileTitle}>Students</h2>
          <p className={styles.tileText}>Got a code from your teacher? Type it in and you&apos;re in. No account, no name, no email.</p>
          <div className={styles.tileCtas}>
            <Link href="/join" className="btn btn-solid">
              Join a class
            </Link>
            <Link href="/student/signin" className="btn">
              Student sign in
            </Link>
          </div>
        </div>
        <div className={`${styles.tile} ${styles.tileDemo} reveal`} data-cap="lum">
          <div className={styles.demoCopy}>
            <h2 className={styles.tileTitle}>Try a real lab</h2>
            <p className={styles.tileText}>Six tubes, one blackout sleeve. Find the faintest stain luminol can detect, right in your browser.</p>
            <div className={styles.tileCtas}>
              <Link href="/demo" className="btn btn-white">
                Try the demo
              </Link>
            </div>
          </div>
          <div className={styles.demoArt} aria-hidden="true">
            <KitArt kit="luminol" />
          </div>
        </div>
      </section>

      <section className={styles.how} id="how" aria-labelledby="how-title">
        <div className="container-wide">
          <h2 id="how-title" className={`${styles.howTitle} reveal`}>
            From the box to the classroom
          </h2>
          {/* A procedure, so it is numbered: each step shows the real thing you handle at that step. */}
          <ol className={styles.steps}>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                1
              </span>
              <h3 className={styles.stepTitle}>Redeem your kit</h3>
              <p>The code inside the kit box unlocks its lessons, labs, videos and teacher guide.</p>
              <span className={styles.stepThing} aria-hidden="true">
                <code className="sx-ticket sx-ticket-sm">LMN-7K3D-Q9TX</code>
              </span>
            </li>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                2
              </span>
              <h3 className={styles.stepTitle}>Set up your classes</h3>
              <p>
                Up to {MAX_CLASSES_PER_TEACHER} classes with {MAX_STUDENTS_PER_CLASS} students each. Every class gets its own join code.
              </p>
              <span className={styles.stepThing} aria-hidden="true">
                <code className="sx-ticket sx-ticket-sm">KQWMTR</code>
              </span>
            </li>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                3
              </span>
              <h3 className={styles.stepTitle}>Assign and teach</h3>
              <p>Switch on what each class sees. Students open it on any Chromebook, and you see their results.</p>
              <span className={styles.stepThing} aria-hidden="true">
                <span className="sx-switch" aria-pressed="true" />
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.trust} aria-label="Standards and privacy">
        <div className={`container-wide ${styles.trustInner}`}>
          <p>
            <Icon name="ngss" size={18} /> Every lesson lists its NGSS performance expectations.
          </p>
          <p>
            <Icon name="shield" size={18} /> Student data is never sold, never used for ads, never used to train AI.{" "}
            <Link href="/privacy" className="text-link">
              Privacy
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
