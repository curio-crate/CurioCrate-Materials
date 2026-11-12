import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageHead } from "@/components/ui/PageHead";
import { CONTACT_EMAIL, GOVERNING_STATE, LEGAL_NAME, MAILING_ADDRESS, prettyDate, REFUND_DAYS } from "@/lib/legal";
import { STUDENT_MIN_AGE, TERMS_VERSION } from "@/lib/terms";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Terms of Use", description: "The agreement for teachers, schools and students using CurioCrate Materials." };

const LAW = GOVERNING_STATE ? `the State of ${GOVERNING_STATE}` : `the state where ${LEGAL_NAME} is organized`;
const COURTS = GOVERNING_STATE ? `the state and federal courts located in ${GOVERNING_STATE}` : `the state and federal courts where ${LEGAL_NAME} is organized`;

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={`card ${styles.block}`} aria-labelledby={`${id}-h`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={`${id}-h`} className="h3">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The user agreement. Accounts record the TERMS_VERSION they accepted (src/lib/terms.ts). */
export default function TermsPage() {
  return (
    <div className="container">
      <PageHead
        eyebrow="Terms of Use"
        size="h1"
        title="The agreement, in plain language."
        lead={`Last updated ${prettyDate(TERMS_VERSION)}. These terms are an agreement between you and ${LEGAL_NAME} and cover everyone who uses materials.curiocrate.org. By using the site you agree to them. Our Privacy Policy explains what we store.`}
      />

      <div className="stack" style={{ gap: 20 }}>
        <Section id="everyone" eyebrow="Everyone" title="Using CurioCrate Materials">
          <ul className={styles.list}>
            <li>CurioCrate Materials is run by {LEGAL_NAME} for science teaching in grades 4–10.</li>
            <li>Don&apos;t try to break, overload, scrape or get around the site&apos;s security, don&apos;t sign in as someone else, and don&apos;t upload or share anything unlawful, harmful or that you don&apos;t have the right to share.</li>
            <li>You&apos;re responsible for what happens in your account. Keep your sign-in private and tell us right away if you think someone else is using it.</li>
            <li>We may suspend or close an account that breaks these terms or puts students or the site at risk. You can stop using the site and delete your account at any time.</li>
            <li>We may change, add or remove lessons, labs and features. If we stop offering a paid feature before your paid period ends, we&apos;ll refund the unused part.</li>
          </ul>
        </Section>

        <Section id="content" eyebrow="Content" title="Who owns what">
          <ul className={styles.list}>
            <li>Lessons, labs, videos, guides, software and the CurioCrate name and logo belong to {LEGAL_NAME} or its licensors.</li>
            <li>We give you a limited, personal, non-transferable license to use the material you have access to for teaching and learning, and to print it for your own classes. Don&apos;t resell, republish, or share access to paid material outside your own account or school license.</li>
            <li>
              Next Generation Science Standards (NGSS) is a registered trademark of WestEd. Neither WestEd nor the lead states and partners that developed the NGSS were involved in producing this product, and they do not endorse it. Google, Clever and ClassLink are trademarks of their owners and are used only to show sign-in options.
            </li>
            <li>
              If you believe something on the site infringes your copyright, email{" "}
              <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>{" "}
              with the material, where it appears, your contact details and a statement that you own the rights. We&apos;ll review it and remove infringing material.
            </li>
          </ul>
        </Section>

        <Section id="safety" eyebrow="Physical kits" title="Lab safety">
          <ul className={styles.list}>
            <li>Hands-on activities with physical kits must be supervised by a responsible adult, who is responsible for the activity, the space and the students&apos; safety.</li>
            <li>Follow every safety step and warning in the lesson and on the kit, use the safety equipment the lesson calls for, keep materials away from eyes and mouths, and follow your school&apos;s lab-safety rules and the product labels.</li>
            <li>Check for allergies and sensitivities before an activity, and don&apos;t use parts that are damaged, missing or past their date. Contact us for replacements.</li>
            <li>Online labs are simulations for learning. They are not instructions for experiments beyond the ones in the lessons.</li>
          </ul>
        </Section>

        <Section id="teachers" eyebrow="Teachers and schools" title="Teacher accounts and classes">
          <ul className={styles.list}>
            <li>Sign in with your school account. You confirm that you are a teacher or school staff member using the site for your school, and that you&apos;re allowed to agree to these terms for that use.</li>
            <li>A kit code is a personal seat for the teacher who redeems it. Colleagues need their own code or a school license.</li>
            <li>Each teacher can run up to 6 classes, with up to 35 students in each class.</li>
            <li>When you invite students with a class code, you do so for your school&apos;s educational purposes, with your school&apos;s permission and consent for student use of online tools, including Curie.AI if you turn it on. You&apos;ll make sure students use the site appropriately.</li>
            <li>You can read your classes&apos; lab results and Curie.AI chats, and you control what each class sees.</li>
            <li>If your school or district has a signed agreement with us (such as a purchase agreement or data privacy agreement), that agreement controls where it differs from these terms.</li>
          </ul>
        </Section>

        <Section id="curie" eyebrow="Curie.AI" title="The AI lab partner">
          <ul className={styles.list}>
            <li>Curie.AI gives hints using artificial intelligence. Its answers can be wrong, incomplete or unexpected. Check them against the lesson and your teacher.</li>
            <li>Curie.AI is not a substitute for a teacher&apos;s supervision, lab-safety instructions, or medical, emergency or mental-health help. In an emergency, tell an adult right away or call 911.</li>
            <li>Don&apos;t share personal information in chats. Teachers can read every chat.</li>
          </ul>
        </Section>

        <Section id="payments" eyebrow="Payments" title="Subscriptions, renewal and refunds">
          <ul className={styles.list}>
            <li>Prices are shown on the <Link className="link" href="/plans">Plans</Link> page, in U.S. dollars, plus any applicable tax.</li>
            <li>
              <strong>Subscriptions renew automatically</strong> every year at the then-current price, charged to the same payment method, until you cancel. We&apos;ll email you before a renewal, and before any price change takes effect.
            </li>
            <li>
              You can cancel at any time online from your{" "}
              <Link className="link" href="/account">
                account page
              </Link>{" "}
              (Manage or cancel subscription), or by emailing{" "}
              <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . Cancelling stops the next renewal, and you keep access until the end of the year you paid for.
            </li>
            <li>
              <strong>{REFUND_DAYS}-day refund:</strong> if you ask within {REFUND_DAYS} days of any charge, including a renewal, we&apos;ll refund it in full and end that subscription. After {REFUND_DAYS} days, payments aren&apos;t refundable except where the law requires.
            </li>
            <li>Purchase orders and distributor sales follow the terms on the order or invoice.</li>
            <li>Online access that comes with a physical kit doesn&apos;t expire for as long as we offer CurioCrate Materials. If we ever stop offering it, we&apos;ll give at least 90 days&apos; notice.</li>
          </ul>
        </Section>

        <Section id="students" eyebrow="Students" title="Student accounts">
          <ul className={styles.list}>
            <li>Student accounts are for students {STUDENT_MIN_AGE} and older. If you are younger, use the class code your teacher gives you instead.</li>
            <li>If you are under 18, please read these terms with a parent or guardian.</li>
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
        </Section>

        <Section id="legal" eyebrow="Legal" title="Warranties, liability and disputes">
          <p className="muted">
            <strong>Disclaimer.</strong> TO THE FULLEST EXTENT THE LAW ALLOWS, THE SITE, ITS CONTENT AND CURIE.AI ARE PROVIDED “AS IS” AND “AS AVAILABLE”, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON-INFRINGEMENT. We work hard to keep the site available and accurate, but we don&apos;t promise it will be uninterrupted, error-free or meet every need. Physical kits are covered by any warranty that comes with them.
          </p>
          <p className="muted">
            <strong>Limitation of liability.</strong> TO THE FULLEST EXTENT THE LAW ALLOWS, {LEGAL_NAME.toUpperCase()} AND ITS PEOPLE WON&apos;T BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR LOST DATA, PROFITS OR REVENUE, ARISING FROM THE SITE OR THESE TERMS. OUR TOTAL LIABILITY FOR ANY CLAIM IS LIMITED TO THE GREATER OF THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR $100. These limits don&apos;t apply to liability that can&apos;t be limited by law, such as for gross negligence, willful misconduct, or death or personal injury caused by our negligence, and they don&apos;t limit our obligations under a signed data privacy agreement.
          </p>
          <p className="muted">
            <strong>Responsibility for misuse.</strong> To the extent the law allows, an adult user or organization that misuses the site or breaks these terms is responsible for the claims and costs that result. This doesn&apos;t apply to students, or to public schools where the law doesn&apos;t allow it.
          </p>
          <p className="muted">
            <strong>Disputes.</strong> Please contact us first: most problems can be solved by email, and we&apos;ll try in good faith for 30 days before either side goes to court. These terms are governed by the laws of {LAW}, without regard to conflict-of-law rules, and disputes will be heard in {COURTS}. Either side may bring a claim in small-claims court. If you use the site for a public school or agency whose law requires a different governing law or forum, that law applies instead.
          </p>
          <p className="muted">
            <strong>Changes.</strong> We may update these terms. We&apos;ll post the new version here with a new date, and for material changes we&apos;ll notify account holders by email or on the site at least 14 days before they take effect, and may ask you to agree again. If you keep using the site after changes take effect, the new terms apply. If you don&apos;t agree, stop using the site and, for a subscription, ask for a refund of the unused part.
          </p>
          <p className="muted">
            <strong>General.</strong> These terms and our Privacy Policy are the whole agreement between you and {LEGAL_NAME} about the site, except for any signed agreement with your school or district. If a part of these terms can&apos;t be enforced, the rest still applies. Not enforcing a term isn&apos;t a waiver of it. You can&apos;t transfer these terms without our written consent; we may transfer them as part of a merger or sale, with this agreement continuing to protect you. Sections on content ownership, disclaimers, liability and disputes survive after your account ends.
          </p>
        </Section>

        <p className="hint">
          Questions about these terms: {LEGAL_NAME}
          {MAILING_ADDRESS ? `, ${MAILING_ADDRESS}` : ""},{" "}
          <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
