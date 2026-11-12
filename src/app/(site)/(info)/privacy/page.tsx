import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { CONTACT_EMAIL, CONTRACT_END_DELETE_DAYS, CURIE_RETENTION_DAYS, LEGAL_NAME, MAILING_ADDRESS, prettyDate, PRIVACY_VERSION, SERVICE_PROVIDERS } from "@/lib/legal";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Curiocrate Materials collects, uses and protects student and teacher data." };

// Every statement here must match what the code does. When you change what we store, how long we keep it or who
// processes it, update this page and PRIVACY_VERSION (src/lib/legal.ts) in the same change.

const COMMITMENTS = [
  { title: "Class codes stay anonymous", text: "Students who join with a teacher's class code are never asked for a name, email, birthday or photo. They get a random nickname like “Curious Otter”. We keep their lab results, and their Curie.AI chats if the teacher turns it on, so the teacher can see them." },
  { title: "Student accounts are optional, 13+ only", text: "Students 13 and older may make a free account. It holds only an email, a scrambled password, a generated nickname and a birth year. Younger students can't make one." },
  { title: "Teachers: only what we need", text: "Name, school email and school, plus a record of what you open (so we can report usage totals to your district) and sign-in details that keep your account secure." },
  { title: "No selling, no ads, no AI training", text: "We don't sell personal information, show ads, or build profiles of students. Student data is used only to provide the service. It is never used to train AI models, by us or by our AI provider." },
  { title: "Deleted when you ask", text: `Teachers and students can delete their own accounts at any time, and the deletion is immediate. When a school's or district's contract ends, we delete all of its data within ${CONTRACT_END_DELETE_DAYS} days.` },
  { title: "Curie.AI is off by default", text: `A teacher turns it on for each class. Messages are filtered, the teacher can read every chat, and chats are deleted after ${CURIE_RETENTION_DAYS} days.` },
];

const COOKIES = [
  { name: "cc_session", who: "Teachers", why: "Keeps you signed in", lasts: "30 days, or until you sign out" },
  { name: "cc_student", who: "Class-code students", why: "Remembers the student's device in the class", lasts: "180 days" },
  { name: "cc_learner", who: "Student accounts", why: "Keeps the student signed in", lasts: "30 days" },
  { name: "cc_age_gate", who: "Student sign-up", why: "Remembers that the age question was answered “under 13”, so it can't be retried", lasts: "1 day" },
  { name: "cc_oauth", who: "Teachers", why: "Protects the sign-in step with Google, Clever or ClassLink", lasts: "A few minutes" },
];

export default function PrivacyPage() {
  return (
    <div className="container">
      <PageHead eyebrow="Privacy Policy" title="Built for kids, so it keeps very little." lead={`Effective ${prettyDate(PRIVACY_VERSION)}. CurioCrate Materials (materials.curiocrate.org) is run by ${LEGAL_NAME} for science teaching in grades 4–10. This policy explains what we collect, why, who we share it with, how long we keep it and how to have it deleted.`} />
      <ul className={styles.grid}>
        {COMMITMENTS.map((c) => (
          <li key={c.title} className={`card ${styles.block}`}>
            <h2 className="h4">{c.title}</h2>
            <p className="muted">{c.text}</p>
          </li>
        ))}
      </ul>

      <div className={`stack ${styles.section}`} style={{ gap: 20 }}>
        <section id="collect" className={`card ${styles.block}`} aria-labelledby="collect-h">
          <span className="eyebrow">What we collect</span>
          <h2 id="collect-h" className="h3">
            Everything we store, by who you are
          </h2>
          <h3 className="h4">Students who join with a class code (any age)</h3>
          <ul className={styles.list}>
            <li>A generated nickname, the class they joined, and when the device was last used.</li>
            <li>Lab results they record: numbers and short values only. Students can&apos;t type free text into labs.</li>
            <li>If the teacher turns on Curie.AI: the student&apos;s chat messages and Curie&apos;s replies. Messages that look like personal information (an email, phone number, street address, or phrases like “my name is”) are blocked, never sent to the AI, and stored only as “[removed]”. Filters can miss things, so teachers should remind students not to share personal details.</li>
          </ul>
          <h3 className="h4">Student accounts (13 and older)</h3>
          <ul className={styles.list}>
            <li>Email address, to sign in. We never send marketing to students.</li>
            <li>Password, stored only as a one-way scrambled hash. Nobody at {LEGAL_NAME} can read it.</li>
            <li>Nickname, picked from our word lists and never typed, so it can&apos;t contain a real name.</li>
            <li>Birth year, from the age question, to confirm the student is 13 or older. If the answer is under 13, nothing is stored.</li>
            <li>The version of the Terms of Use agreed to and when, when the account was last used, and failed sign-in attempts (to stop password guessing).</li>
          </ul>
          <p className="muted">Student accounts don&apos;t store lab results, chats or what was opened.</p>
          <h3 className="h4">Teachers and school staff</h3>
          <ul className={styles.list}>
            <li>Name and school email, from Google, Clever or ClassLink when you sign in, and which of these you use.</li>
            <li>Your school or district, your role there, and the version of the Terms you agreed to.</li>
            <li>Kits you redeemed, subscriptions, and the classes you create.</li>
            <li>Which lessons and files you open, and how much of each video is watched. Districts see this only as totals for each school.</li>
            <li>For each sign-in: your browser type and a keyed, one-way hash of your network address (never the address itself), so we can spot a shared or stolen account.</li>
            <li>A log of important actions, such as redeeming a code or changing a class, for security and support.</li>
          </ul>
          <h3 className="h4">Purchases</h3>
          <ul className={styles.list}>
            <li>For orders and subscriptions: the buyer&apos;s name and email, purchase order or invoice numbers, and what was bought. Card payments are handled by Stripe; we never see or store full card numbers.</li>
          </ul>
          <h3 className="h4">Everyone</h3>
          <ul className={styles.list}>
            <li>Our hosting providers keep short-lived technical logs of requests (such as IP address and browser type) to run and protect the site.</li>
            <li>If you email us, we keep the email to answer it.</li>
          </ul>
        </section>

        <section id="use" className={`card ${styles.block}`} aria-labelledby="use-h">
          <span className="eyebrow">How we use it</span>
          <h2 id="use-h" className="h3">
            Only to run the service
          </h2>
          <ul className={styles.list}>
            <li>To sign you in, give you the kits and plans you have, run classes, and show teachers their students&apos; lab results and chats.</li>
            <li>To give districts school-by-school usage totals for the licenses they pay for.</li>
            <li>To keep the site secure, prevent abuse and fix problems, and to answer support requests.</li>
            <li>To email teachers about their account, purchases and important changes. We don&apos;t email students except to run their account.</li>
          </ul>
          <p className="muted">
            We don&apos;t sell or rent personal information, use it for advertising (targeted or otherwise), build profiles of students for any non-school purpose, or use it to train AI models. We only use student data for the educational purposes the school authorized.
          </p>
        </section>

        <section id="sharing" className={`card ${styles.block}`} aria-labelledby="sharing-h">
          <span className="eyebrow">Sharing</span>
          <h2 id="sharing-h" className="h3">
            Who else handles data
          </h2>
          <p className="muted">
            We share data only with the service providers below, who process it on our behalf and only to provide their service to us. We also share it when a school or district that controls the data directs us to, when the law requires it, or to protect someone&apos;s safety. If {LEGAL_NAME} merges or is acquired, the new owner must keep this policy&apos;s promises for data already collected, and schools will be told first.
          </p>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Service providers that process personal data</caption>
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">What for</th>
                  <th scope="col">What they handle</th>
                </tr>
              </thead>
              <tbody>
                {SERVICE_PROVIDERS.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.purpose}</td>
                    <td>{p.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="retention" className={`card ${styles.block}`} aria-labelledby="retention-h">
          <span className="eyebrow">Retention and deletion</span>
          <h2 id="retention-h" className="h3">
            How long we keep it
          </h2>
          <ul className={styles.list}>
            <li>Curie.AI chats: deleted automatically after {CURIE_RETENTION_DAYS} days.</li>
            <li>Class-code students, their lab results and chats: until the teacher deletes the class or their account, or the school&apos;s data is deleted.</li>
            <li>Student accounts: until the student deletes it. Deletion is immediate and removes everything.</li>
            <li>Teacher accounts: until the teacher deletes it from their account page, which immediately removes their classes, students, lab results, chats and usage, and removes their email from our logs.</li>
            <li>Schools and districts: within {CONTRACT_END_DELETE_DAYS} days after the contract ends or the school asks, we delete all of its teachers, classes, students and usage.</li>
            <li>Purchase records: kept as long as tax and accounting law requires. When a school&apos;s data is deleted, we remove the buyer&apos;s name and email from them.</li>
          </ul>
          <p className="muted">
            Teachers can download a copy of their data from their{" "}
            <Link className="link" href="/account">
              account page
            </Link>
            . Anyone can ask us to see, correct or delete their data, or a copy of it, by emailing us. We do this for everyone, wherever you live, and we won&apos;t treat you differently for asking.
          </p>
        </section>

        <section id="student-accounts" className={`card ${styles.block}`} aria-labelledby="laws">
          <span className="eyebrow">Children and schools</span>
          <h2 id="laws" className="h3">
            COPPA, FERPA and student privacy laws
          </h2>
          <ul className={styles.list}>
            <li>
              <strong>Children under 13 (COPPA).</strong> Children under 13 can&apos;t make an account. They use the site only through a class code from their teacher, which a school provides for its own educational purposes. The school gives consent on parents&apos; behalf for that use, as the Federal Trade Commission allows. We collect only what the class needs and never use it for commercial purposes.
            </li>
            <li>
              <strong>Parents.</strong> A parent can ask to review their child&apos;s information, have it deleted, or stop further collection, through the child&apos;s school or by emailing us. Because class-code students are anonymous, we work with the teacher to find the right records.
            </li>
            <li>
              <strong>Schools (FERPA).</strong> For schools, we act as a “school official” under the school&apos;s direct control. Student records belong to the school, and we use them only for the school&apos;s purposes.
            </li>
            <li>
              <strong>State student privacy laws.</strong> Including California&apos;s SOPIPA: no targeted advertising, no profiling for non-school purposes, no sale of student data, and reasonable security.
            </li>
            <li>
              <strong>Data privacy agreements.</strong> We will sign a district&apos;s data privacy agreement, including the Student Data Privacy Consortium&apos;s National DPA. Where a signed agreement differs from this policy, the agreement controls for that district&apos;s data.
            </li>
          </ul>
        </section>

        <section id="cookies" className={`card ${styles.block}`} aria-labelledby="cookies-h">
          <span className="eyebrow">Cookies</span>
          <h2 id="cookies-h" className="h3">
            Only the cookies needed to sign in
          </h2>
          <p className="muted">We don&apos;t use analytics, advertising or tracking cookies, and we don&apos;t track you across other websites. These are the only cookies the site sets:</p>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Cookies set by materials.curiocrate.org</caption>
              <thead>
                <tr>
                  <th scope="col">Cookie</th>
                  <th scope="col">Who gets it</th>
                  <th scope="col">Why</th>
                  <th scope="col">How long</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((c) => (
                  <tr key={c.name}>
                    <td className={styles.mono}>{c.name}</td>
                    <td>{c.who}</td>
                    <td>{c.why}</td>
                    <td>{c.lasts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="security" className={`card ${styles.block}`} aria-labelledby="security-h">
          <span className="eyebrow">Security</span>
          <h2 id="security-h" className="h3">
            How we protect it
          </h2>
          <ul className={styles.list}>
            <li>All traffic is encrypted with HTTPS. Passwords are stored as one-way hashes, and sign-in tokens are stored only as hashes.</li>
            <li>Only staff who need it for their job can see personal data, and staff access is logged.</li>
            <li>Files and videos are served through short-lived signed links, never public addresses.</li>
          </ul>
          <p className="muted">
            No system is perfectly secure. If a breach affects your data, we will tell affected schools and users without unreasonable delay and as the law and any data privacy agreement require.
          </p>
        </section>

        <section id="changes" className={`card ${styles.block}`} aria-labelledby="changes-h">
          <span className="eyebrow">Changes and contact</span>
          <h2 id="changes-h" className="h3">
            Changes to this policy, and how to reach us
          </h2>
          <p className="muted">
            We&apos;ll post any change here with a new effective date. Before a material change in how we use student data takes effect, we&apos;ll tell schools and teachers, and we&apos;ll get consent where the law or a data privacy agreement requires it. We will never use data already collected in a materially different way without that consent.
          </p>
          <p className="muted">
            {LEGAL_NAME}
            {MAILING_ADDRESS ? `, ${MAILING_ADDRESS}` : ""}.{" "}
            Questions, requests or a DPA to sign:{" "}
            <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . See also our <Link className="link" href="/terms">Terms of Use</Link> and <Link className="link" href="/schools/it">domain list for IT</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
