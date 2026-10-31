"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "../account.module.css";
import { createSchoolAction, joinSchoolAction } from "./actions";

export function OnboardingForms({ next, domain }: { next: string; domain: string | null }) {
  const [joinState, join] = useActionState(joinSchoolAction, null);
  const [createState, create] = useActionState(createSchoolAction, null);
  return (
    <div className={styles.twoUp}>
      <form action={join} className={`card ${styles.panel} ${styles.form}`} aria-labelledby="join-title">
        <div>
          <span className="eyebrow">Option 1</span>
          <h2 id="join-title" className={`h3 ${styles.cardTitle}`}>
            Join your school
          </h2>
          <p className="hint">A colleague can find your school&apos;s 6-letter code on their dashboard. Your school admin approves you before any school-wide access applies.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label className="label" htmlFor="school-code">
            School code
          </label>
          <input id="school-code" name="code" className="input input-code" required minLength={6} maxLength={8} autoComplete="off" placeholder="ABCDEF" />
        </div>
        <FormMessage state={joinState} />
        <SubmitButton className="btn btn-glass" pendingText="Joining…">
          Join school
        </SubmitButton>
      </form>

      <form action={create} className={`card ${styles.panel} ${styles.form}`} aria-labelledby="create-title">
        <div>
          <span className="eyebrow">Option 2</span>
          <h2 id="create-title" className={`h3 ${styles.cardTitle}`}>
            Set up your school
          </h2>
          <p className="hint">First teacher from your school? Add it here. You become its school admin and approve colleagues who join.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label className="label" htmlFor="school-name">
            School name
          </label>
          <input id="school-name" name="name" className="input" required autoComplete="organization" placeholder="Cerritos Middle School" />
        </div>
        <div className={styles.fieldRow}>
          <div className="field">
            <label className="label" htmlFor="city">
              City
            </label>
            <input id="city" name="city" className="input" autoComplete="address-level2" />
          </div>
          <div className="field">
            <label className="label" htmlFor="state">
              State
            </label>
            <input id="state" name="state" className="input" autoComplete="address-level1" maxLength={2} placeholder="CA" />
          </div>
        </div>
        {domain && (
          <label className="checkbox">
            <input type="checkbox" name="claimDomain" defaultChecked />
            Teachers with @{domain} emails join automatically
          </label>
        )}
        <FormMessage state={createState} />
        <SubmitButton className="btn btn-solid" pendingText="Creating…">
          Create school
        </SubmitButton>
      </form>
    </div>
  );
}
