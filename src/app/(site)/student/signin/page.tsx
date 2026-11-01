import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/(site)/(account)/account.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { currentLearner } from "@/lib/students";
import { SigninForm } from "../StudentForms";

export const metadata: Metadata = { title: "Student sign in" };

export default async function StudentSigninPage() {
  if (await currentLearner()) redirect("/student");
  return (
    <div className="container">
      <div className={styles.wrap}>
        <PageHead center size="h1" eyebrow="Students" title="Welcome back" lead="Sign in to your free student account." />
        <section className={`card ${styles.panel} rise-4`} aria-label="Student sign in">
          <SigninForm />
        </section>
        <p className={styles.switch}>
          New here?{" "}
          <Link href="/student/signup" className="link">
            Create a free account
          </Link>{" "}
          · In a class?{" "}
          <Link href="/join" className="link">
            Use your class code
          </Link>
        </p>
      </div>
    </div>
  );
}
