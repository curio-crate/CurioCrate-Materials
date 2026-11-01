import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MAX_CLASSES_PER_TEACHER, MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { HeroPreview } from "./HeroPreview";
import styles from "./home.module.css";

const STEPS = [
  { icon: "key", title: "Redeem your kit", text: "The code inside the kit box unlocks its lessons, labs, videos and teacher guide on your account." },
  { icon: "users", title: "Set up your classes", text: `Up to ${MAX_CLASSES_PER_TEACHER} classes with ${MAX_STUDENTS_PER_CLASS} students each. Every class gets its own join code.` },
  { icon: "check", title: "Assign and teach", text: "Pick what each class sees. Students open it on any Chromebook, and you see their lab results." },
] as const;

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container-wide ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={`${styles.pill} rise`}>
              <Icon name="ngss" size={14} /> NGSS-aligned · Grades 4–10
            </p>
            <h1 id="hero-title" className={`display rise-2`}>
              Hands-on science, <span className="italic-accent">ready to teach.</span>
            </h1>
            <p className={`lead ${styles.heroLead} rise-3`}>Every CurioCrate kit comes with online lessons, labs, videos and a teacher guide. Set up a class in a minute and assign exactly what your students need.</p>
            <div className={`${styles.ctas} rise-4`}>
              <Link href="/signin" className="btn btn-solid btn-lg">
                Teacher sign in
              </Link>
              <Link href="/demo" className="btn btn-lg">
                Try our demo <Icon name="arrow" size={16} />
              </Link>
            </div>
            <p className={`${styles.studentNote} rise-4`}>
              Student? <Link href="/join">Join your class or sign in →</Link>
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
            <span className="eyebrow">How it works</span>
            <h2 id="how-title" className="h2">
              From the box to the classroom in three steps.
            </h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={`${styles.step} reveal`}>
                <span className={styles.stepIcon} aria-hidden="true">
                  <Icon name={s.icon} size={20} />
                </span>
                <span className={styles.stepNum}>Step {i + 1}</span>
                <h3 className="h3">{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="students-title">
        <div className="container-wide">
          <div className={`${styles.students} reveal`}>
            <div className={styles.studentsHead}>
              <span className="eyebrow">For students</span>
              <h2 id="students-title" className="h2">
                Two simple ways in.
              </h2>
            </div>
            <div className={styles.studentCards}>
              <Link href="/join" className={`card card-link ${styles.studentCard}`}>
                <Icon name="users" size={22} />
                <h3 className="h4">In a class</h3>
                <p className="muted">Type the code from your teacher. No account, no name, no email.</p>
                <span className="text-link">Join a class →</span>
              </Link>
              <Link href="/student/signup" className={`card card-link ${styles.studentCard}`}>
                <Icon name="user" size={22} />
                <h3 className="h4">On your own (13+)</h3>
                <p className="muted">Make a free student account to explore the free lessons and labs from every kit.</p>
                <span className="text-link">Create a free account →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.trust} aria-label="Standards and privacy">
        <div className={`container-wide ${styles.trustInner} reveal`}>
          <p>
            <Icon name="ngss" size={16} /> Every lesson lists its NGSS performance expectations.
          </p>
          <p>
            <Icon name="shield" size={16} /> Student data is never sold, never used for ads, never used to train AI.{" "}
            <Link href="/privacy" className="text-link">
              Privacy →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
