import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import styles from "@/app/(site)/(account)/account.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { randomNickname } from "@/lib/classes";
import { verifyToken } from "@/lib/crypto";
import { AGE_GATE_COOKIE, currentLearner } from "@/lib/students";
import { STUDENT_MIN_AGE } from "@/lib/terms";
import { AgeForm, SignupForm } from "../StudentForms";

export const metadata: Metadata = { title: "Create a student account" };

export default async function StudentSignupPage(props: PageProps<"/student/signup">) {
  if (await currentLearner()) redirect("/student");
  const sp = await props.searchParams;
  const under = !!(await cookies()).get(AGE_GATE_COOKIE);
  const ageToken = typeof sp.age === "string" ? sp.age : "";
  const ageOk = !under && !!ageToken && !!(await verifyToken(ageToken, "student-age"));
  const nicknames = [...new Set(Array.from({ length: 12 }, randomNickname))].slice(0, 4);

  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead center size="h1" eyebrow="Students" title="Create a free account" lead="Explore the free lessons, labs and videos from every CurioCrate kit." />
        <section className={`card ${styles.panel} rise-4`} aria-label="Create a student account">
          {under ? (
            <div className="stack" style={{ gap: 14 }} role="status">
              <h2 className="h3">Ask your teacher for a class code</h2>
              <p className="muted">
                Student accounts are for ages {STUDENT_MIN_AGE} and up. You can still use CurioCrate: your teacher gives your class a code, and you join without an account, a name or an email.
              </p>
              <Link href="/join" className="btn btn-solid">
                Join with a class code
              </Link>
            </div>
          ) : ageOk ? (
            <SignupForm ageToken={ageToken} nicknames={nicknames} />
          ) : (
            <AgeForm thisYear={new Date().getFullYear()} />
          )}
        </section>
        <p className={styles.switch}>
          Already have an account?{" "}
          <Link href="/student/signin" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
