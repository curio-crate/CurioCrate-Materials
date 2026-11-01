import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Student privacy", description: "How Curiocrate Materials protects student and teacher data." };

const COMMITMENTS = [
  { title: "Class codes stay anonymous", text: "Students in a class join with their teacher's code. We never ask them for a name, email, birthday or photo, and we don't store one: just a random nickname like “Curious Otter”." },
  { title: "Student accounts are optional, 13+ only", text: "Students 13 and older may make a free account to explore free material. It holds only an email, a scrambled password, a generated nickname and a birth year. Younger students can't make one." },
  { title: "Teachers keep only what's needed", text: "A teacher's name, school email and school, so we can give them the kits they own and run their classes." },
  { title: "Never sold, never ads, never AI training", text: "Student and teacher data is never sold, never used for advertising, and never used to train AI models, ours or anyone's." },
  { title: "Deleted when you ask", text: "Teachers and students can delete their own accounts at any time. When a school's or district's contract ends, we delete all of its data." },
  { title: "Curie.AI is off by default", text: "A teacher turns it on per class. Chats are filtered for age-appropriate content, the teacher can read every one, and they are deleted automatically." },
];

export default function PrivacyPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Student privacy" title="Built for kids, so it keeps almost nothing." lead="Curiocrate Materials is designed to collect as little as possible about students and teachers in grades 4–10." />
      <ul className={styles.grid}>
        {COMMITMENTS.map((c) => (
          <li key={c.title} className={`card ${styles.block}`}>
            <h2 className="h4">{c.title}</h2>
            <p className="muted">{c.text}</p>
          </li>
        ))}
      </ul>
      <section id="student-accounts" className={`card ${styles.block} ${styles.section}`} aria-labelledby="accounts">
        <span className="eyebrow">Student accounts</span>
        <h2 id="accounts" className="h3">
          What a student account stores, and why
        </h2>
        <ul className={styles.list}>
          <li>Email address: to sign in. We never send marketing to students.</li>
          <li>Password: stored only as a one-way scrambled hash. Nobody at CurioCrate can read it.</li>
          <li>Nickname: picked from our word lists, never typed, so it can&apos;t contain a real name.</li>
          <li>Birth year: from the age question, to confirm the student is 13 or older. If the answer is under 13, nothing is stored.</li>
          <li>The version of the Terms of Use the student agreed to, and when.</li>
        </ul>
        <p className="muted">
          Student accounts don&apos;t store lab results, chats or what was opened. A student can delete their account from their page at any time, which removes all of it immediately.
        </p>
      </section>
      <section className={`card ${styles.block} ${styles.section}`} aria-labelledby="laws">
        <span className="eyebrow">Compliance</span>
        <h2 id="laws" className="h3">
          COPPA, FERPA, SOPIPA and district agreements
        </h2>
        <p className="muted">
          The platform is designed for COPPA (children under 13 can&apos;t make accounts, and class codes collect no personal information), FERPA (teachers act on behalf of the school, and student records stay under school control) and California SOPIPA (no targeted advertising, no profiling, no sale). We sign district data privacy agreements, including the Student Data Privacy Consortium&apos;s National DPA.
        </p>
        <p className="muted">
          Questions or a DPA to sign:{" "}
          <a className="link" href="mailto:contact@curiocrate.org">
            contact@curiocrate.org
          </a>
          . See also our <Link className="link" href="/schools/it">domain list for IT</Link>.
        </p>
      </section>
    </div>
  );
}
