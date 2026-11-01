"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "../(account)/account.module.css";
import { ageAction, signinAction, signupAction } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function AgeForm({ thisYear }: { thisYear: number }) {
  const [state, action] = useActionState(ageAction, null);
  return (
    <form action={action} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className="label">When were you born?</legend>
        <div className={styles.fieldRowEven}>
          <div className="field">
            <label className="sr-only" htmlFor="month">
              Month
            </label>
            <select id="month" name="month" className="select" required defaultValue="">
              <option value="" disabled>
                Month
              </option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="year">
              Year
            </label>
            <select id="year" name="year" className="select" required defaultValue="">
              <option value="" disabled>
                Year
              </option>
              {Array.from({ length: 80 }, (_, i) => thisYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-solid btn-lg" pendingText="Checking…">
        Continue
      </SubmitButton>
    </form>
  );
}

export function SignupForm({ ageToken, nicknames }: { ageToken: string; nicknames: string[] }) {
  const [state, action] = useActionState(signupAction, null);
  const router = useRouter();
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="age" value={ageToken} />
      <fieldset className={styles.fieldset}>
        <legend className="label">Pick your nickname</legend>
        <p className="hint">This is the only name we show. We never ask for your real name.</p>
        <div className={styles.nicknames}>
          {nicknames.map((n, i) => (
            <label key={n} className={styles.nickname}>
              <input type="radio" name="nickname" value={n} defaultChecked={i === 0} required />
              <span>{n}</span>
            </label>
          ))}
        </div>
        <button type="button" className="text-link" onClick={() => router.refresh()}>
          Show other nicknames
        </button>
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" maxLength={254} />
        <p className="hint">Only used to sign in. We never email you marketing.</p>
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" className="input" required minLength={8} maxLength={200} autoComplete="new-password" />
        <p className="hint">At least 8 characters.</p>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="agree" required />
        <span>
          I agree to the{" "}
          <Link href="/terms#students" className="link" target="_blank">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy#student-accounts" className="link" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-solid btn-lg" pendingText="Creating your account…">
        Create my account
      </SubmitButton>
    </form>
  );
}

export function SigninForm() {
  const [state, action] = useActionState(signinAction, null);
  return (
    <form action={action} className={styles.form}>
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-solid btn-lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
