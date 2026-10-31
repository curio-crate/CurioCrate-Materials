import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Student privacy", description: "How Curiocrate Materials protects student and teacher data." };

const COMMITMENTS = [
  { title: "No student accounts", text: "Students join a class with a class code. We never ask for a student's name, email, birthday or photo, and we don't store one." },
  { title: "Teachers are the only accounts", text: "A teacher's name and school email are all we keep, so we can give their school access to the kits it owns." },
  { title: "Never sold, never ads, never AI training", text: "Student and teacher data is never sold, never used for advertising, and never used to train AI models, ours or anyone's." },
  { title: "Deleted when a contract ends", text: "When a school's or district's contract ends, we can delete all of its data: teachers, classes, student work and chats." },
  { title: "Curie.AI is off by default", text: "A teacher turns it on per class. Chats are filtered for age-appropriate content, the teacher can read every one, and they are deleted automatically." },
  { title: "Short-lived links", text: "Paid videos and PDFs are delivered through signed links that expire within minutes, so they can't be shared outside your school." },
];

export default function PrivacyPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Student privacy" title="Built for kids," accent="so it keeps almost nothing." lead="Curiocrate Materials is designed to collect as little as possible about students and teachers in grades 4–10." />
      <ul className={styles.grid}>
        {COMMITMENTS.map((c) => (
          <li key={c.title} className={`card ${styles.block}`}>
            <h2 className="h4">{c.title}</h2>
            <p className="muted">{c.text}</p>
          </li>
        ))}
      </ul>
      <section className={`card ${styles.block} ${styles.section}`} aria-labelledby="laws">
        <span className="eyebrow">Compliance</span>
        <h2 id="laws" className="h3">
          COPPA, FERPA, SOPIPA and district agreements
        </h2>
        <p className="muted">
          The platform is designed for COPPA (no personal information from children under 13), FERPA (teachers act on behalf of the school, and student records stay under school control) and California SOPIPA (no targeted advertising, no profiling, no sale). We sign district data privacy agreements, including the Student Data Privacy Consortium&apos;s National DPA.
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
