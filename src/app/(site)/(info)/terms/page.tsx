import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { STUDENT_MIN_AGE, TERMS_VERSION } from "@/lib/terms";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Terms of Use", description: "The agreement for teachers and students using CurioCrate Materials." };

const updated = new Date(`${TERMS_VERSION}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** The user agreement. Accounts record the TERMS_VERSION they accepted (src/lib/terms.ts). */
export default function TermsPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Terms of Use" size="h1" title="The agreement, in plain language." lead={`Last updated ${updated}. These terms cover everyone who uses materials.curiocrate.org. Our Privacy Policy explains what we store.`} />

      <div className="stack" style={{ gap: 20 }}>
        <section className={`card ${styles.block}`} aria-labelledby="everyone">
          <span className="eyebrow">Everyone</span>
          <h2 id="everyone" className="h3">
            Using CurioCrate Materials
          </h2>
          <ul className={styles.list}>
            <li>CurioCrate Materials is run by Curiocrate, a 501(c)(3) nonprofit, for science teaching in grades 4–10.</li>
            <li>Lessons, labs, videos and guides belong to Curiocrate or its partners. You may use them for teaching and learning, and print them for your classes. Please don&apos;t resell, republish or share access to paid material outside your own account.</li>
            <li>Don&apos;t try to break, overload or get around the site&apos;s security, and don&apos;t sign in as someone else.</li>
            <li>Lab activities with the physical kits need the safety steps in each lesson and adult supervision.</li>
            <li>We may suspend an account that breaks these terms. You can stop using the site and delete your account at any time.</li>
            <li>The site is provided as is. We work hard to keep it available and accurate, but we can&apos;t promise it will never be interrupted.</li>
            <li>When these terms change in a way that matters, we&apos;ll ask you to agree again.</li>
          </ul>
        </section>

        <section id="teachers" className={`card ${styles.block}`} aria-labelledby="teachers-h">
          <span className="eyebrow">Teachers</span>
          <h2 id="teachers-h" className="h3">
            Teacher accounts and classes
          </h2>
          <ul className={styles.list}>
            <li>Sign in with your school account. You agree that you are a teacher or school staff member using the site for your school.</li>
            <li>A kit code is a personal seat for the teacher who redeems it. Colleagues need their own code or a school license.</li>
            <li>Each teacher can run up to 6 classes, with up to 35 students in each class.</li>
            <li>When you invite students with a class code, you do so for your school&apos;s educational purposes, under your school&apos;s policies and its consent for student use of online tools.</li>
            <li>You can read your class&apos;s lab results and Curie.AI chats, and you control what each class sees.</li>
          </ul>
        </section>

        <section id="students" className={`card ${styles.block}`} aria-labelledby="students-h">
          <span className="eyebrow">Students</span>
          <h2 id="students-h" className="h3">
            Student accounts
          </h2>
          <ul className={styles.list}>
            <li>Student accounts are for students {STUDENT_MIN_AGE} and older. If you are younger, use the class code your teacher gives you instead.</li>
            <li>Tell the truth about your age, use your own email, and keep your password to yourself.</li>
            <li>A student account opens the free lessons, labs and videos. Your teacher can share more with your class.</li>
            <li>Be kind and use the site for learning. Don&apos;t try to get around the age question or open things you weren&apos;t given.</li>
            <li>
              You can delete your account at any time from your page. See what we store in the{" "}
              <Link href="/privacy#student-accounts" className="link">
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <p className="hint">
          Questions about these terms:{" "}
          <a className="link" href="mailto:contact@curiocrate.org">
            contact@curiocrate.org
          </a>
        </p>
      </div>
    </div>
  );
}
