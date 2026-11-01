import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { STUDENT_MIN_AGE } from "@/lib/terms";
import styles from "./join.module.css";

export const metadata: Metadata = { title: "Students" };

const ERRORS: Record<string, string> = {
  code: "That code didn't work. Check it with your teacher.",
  full: `That class is full (${MAX_STUDENTS_PER_CLASS} students). Ask your teacher.`,
};

/** The one place students start: a class code (any age, anonymous) or a free student account (13+). */
export default async function JoinPage(props: PageProps<"/join">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? (ERRORS[sp.error] ?? ERRORS.code) : null;
  return (
    <div className="container">
      <PageHead center size="h1" eyebrow="Students" title="Let's get you started." lead="In a class? Use your teacher's code. Exploring on your own? Sign in to your student account." />
      <div className={styles.grid}>
        <form action="/api/join" method="post" className={`card ${styles.panel} rise-3`} aria-labelledby="code-title">
          <span className={styles.icon} aria-hidden="true">
            <Icon name="users" size={22} />
          </span>
          <h2 id="code-title" className="h3">
            Join your class
          </h2>
          <p className="muted">Type the code your teacher gave you. No account, no name, no email.</p>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label htmlFor="class-code" className="label">
              Class code
            </label>
            <input id="class-code" name="code" className="input input-code" required minLength={6} maxLength={8} autoComplete="off" autoCapitalize="characters" placeholder="ABCDEF" />
          </div>
          <button type="submit" className="btn btn-solid btn-lg">
            Join class
          </button>
          <p className="hint">You get a fun nickname like “Curious Otter” so your teacher can tell results apart.</p>
        </form>

        <section className={`card ${styles.panel} rise-4`} aria-labelledby="acct-title">
          <span className={styles.icon} aria-hidden="true">
            <Icon name="user" size={22} />
          </span>
          <h2 id="acct-title" className="h3">
            Student account
          </h2>
          <p className="muted">For students {STUDENT_MIN_AGE} and older. Explore the free lessons, labs and videos from every kit.</p>
          <div className={styles.actions}>
            <Link href="/student/signin" className="btn btn-solid btn-lg">
              Sign in
            </Link>
            <Link href="/student/signup" className="btn btn-lg">
              Create a free account
            </Link>
          </div>
          <p className="hint">
            By creating an account you agree to the <Link href="/terms#students" className="link">Terms of Use</Link> and <Link href="/privacy#student-accounts" className="link">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
