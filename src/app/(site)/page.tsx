import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MAX_CLASSES_PER_TEACHER, MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { HeroPreview } from "./HeroPreview";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container-wide ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={`${styles.standard} rise`}>
              <Icon name="ngss" size={15} /> NGSS-aligned kits for grades 4 to 10
            </p>
            <h1 id="hero-title" className={`${styles.display} rise-2`}>
              Hands-on science, ready to teach.
            </h1>
            <p className={`lead ${styles.heroLead} rise-3`}>Every CurioCrate kit comes with online lessons, labs, videos and a teacher guide. Set up a class in a minute and assign exactly what your students need.</p>
            <div className={`${styles.ctas} rise-4`}>
              <Link href="/signin" className="btn btn-solid btn-lg">
                Teacher sign in
              </Link>
              <Link href="/demo" className="btn btn-lg">
                Try the demo
              </Link>
            </div>
            <p className={`${styles.studentNote} rise-4`}>
              Student? <Link href="/join">Join your class or sign in</Link>
            </p>
          </div>
          <div className={`${styles.heroArt} rise-3`}>
            <HeroPreview maxStudents={MAX_STUDENTS_PER_CLASS} />
          </div>
        </div>
      </section>

      <section className={styles.section} id="how" aria-labelledby="how-title">
        <div className="container-wide">
          <div className={`${styles.head} reveal`}>
            <h2 id="how-title" className="h2">
              From the box to the classroom
            </h2>
            <p className="lead">Three steps, done once. After that it&apos;s just switching lessons on for each class.</p>
          </div>
          {/* A procedure, so it is numbered: each step shows the real thing you handle at that step. */}
          <ol className={styles.steps}>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                1
              </span>
              <h3 className="h4">Redeem your kit</h3>
              <p>The code inside the kit box unlocks its lessons, labs, videos and teacher guide on your account.</p>
              <span className={styles.stepThing} aria-hidden="true">
                <code className="sx-ticket sx-ticket-sm">LMN-7K3D-Q9TX</code>
              </span>
            </li>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                2
              </span>
              <h3 className="h4">Set up your classes</h3>
              <p>
                Up to {MAX_CLASSES_PER_TEACHER} classes with {MAX_STUDENTS_PER_CLASS} students each. Every class gets its own join code.
              </p>
              <span className={styles.stepThing} aria-hidden="true">
                <span className={styles.thingLabel}>Period 3</span>
                <code className="sx-ticket sx-ticket-sm">KQWMTR</code>
              </span>
            </li>
            <li className={`${styles.step} reveal`}>
              <span className={styles.stepNum} aria-hidden="true">
                3
              </span>
              <h3 className="h4">Assign and teach</h3>
              <p>Pick what each class sees. Students open it on any Chromebook, and you see their lab results.</p>
              <span className={styles.stepThing} aria-hidden="true">
                <span className={styles.thingLabel}>Find your limit</span>
                <span className="sx-switch" aria-pressed="true" />
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="students-title">
        <div className="container-wide">
          <div className={`${styles.students} reveal`}>
            <div className={styles.studentsHead}>
              <h2 id="students-title" className="h2">
                Students have two ways in
              </h2>
              <p className="muted">Neither needs a school email.</p>
            </div>
            <Link href="/join" className={styles.way}>
              <Icon name="users" size={22} />
              <span className={styles.wayBody}>
                <span className={styles.wayTitle}>In a class</span>
                <span className="muted">Type the code from your teacher. No account, no name, no email.</span>
                <span className="text-link">
                  Join a class <Icon name="arrow" size={14} />
                </span>
              </span>
            </Link>
            <Link href="/student/signup" className={styles.way}>
              <Icon name="user" size={22} />
              <span className={styles.wayBody}>
                <span className={styles.wayTitle}>On your own, 13 and up</span>
                <span className="muted">Make a free student account to explore the free lessons and labs from every kit.</span>
                <span className="text-link">
                  Create a free account <Icon name="arrow" size={14} />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.trust} aria-label="Standards and privacy">
        <div className={`container-wide ${styles.trustInner}`}>
          <p>
            <Icon name="ngss" size={16} /> Every lesson lists its NGSS performance expectations.
          </p>
          <p>
            <Icon name="shield" size={16} /> Student data is never sold, never used for ads, never used to train AI.{" "}
            <Link href="/privacy" className="text-link">
              Privacy
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
