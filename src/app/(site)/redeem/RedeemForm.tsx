"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { KitArtClient } from "@/components/kit/KitArtClient";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { redeemAction } from "./actions";
import styles from "./redeem.module.css";

function formatTyping(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  const parts = [clean.slice(0, 3), ...(clean.slice(3).match(/.{1,4}/g) ?? [])];
  return parts.filter(Boolean).join("-");
}

export function RedeemForm({ initialCode }: { initialCode: string }) {
  const [state, action] = useActionState(redeemAction, null);
  const [code, setCode] = useState(formatTyping(initialCode));

  if (state?.ok) {
    return (
      <div className={`feature-card ${styles.success}`} role="status" aria-live="polite">
        <div className={styles.successCopy}>
          <span className="badge badge-kit">{state.alreadyHad ? "Code redeemed" : "Kit unlocked"}</span>
          <h2 className={`kit-title ${styles.successTitle}`}>{state.kit.name}</h2>
          <p className={styles.successText}>
            {state.alreadyHad
              ? "You already had this kit. The code is now used, so keep it with your records."
              : "Your account can now open the full online kit: lessons, labs, videos, manuals and the teacher guide."}
          </p>
          <div className="row">
            <Link href={`/kits/${state.kit.slug}`} className="btn btn-kit">
              Open the kit →
            </Link>
            <Link href="/dashboard" className="btn btn-kit-ghost">
              Go to dashboard
            </Link>
          </div>
          <p className={styles.share}>Each code unlocks one teacher. Colleagues redeem the code from their own kit, or ask Curiocrate about a school-wide license.</p>
        </div>
        <div className={styles.successArt}>
          <KitArtClient kit={state.kit.slug} />
        </div>
      </div>
    );
  }

  const errorId = state && !state.ok ? "redeem-error" : undefined;
  return (
    <form action={action} className={`card ${styles.form}`}>
      <div className="field">
        <label htmlFor="code" className="label">
          Kit code
        </label>
        <input
          id="code"
          name="code"
          className="input input-code"
          value={code}
          onChange={(e) => setCode(formatTyping(e.target.value))}
          placeholder="LMN-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          aria-invalid={!!errorId}
          aria-describedby={["code-hint", errorId].filter(Boolean).join(" ")}
        />
        <p id="code-hint" className="hint">
          Printed inside the lid, next to the QR code. Letters O and I are read as zero and one, so either works.
        </p>
      </div>
      {state && !state.ok && (
        <p id="redeem-error" className="alert alert-danger" role="alert">
          {state.message}
        </p>
      )}
      <SubmitButton className="btn btn-solid btn-lg btn-block" pendingText="Checking code…">
        Redeem for my account
      </SubmitButton>
    </form>
  );
}
