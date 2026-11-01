import Link from "next/link";
import { sharingAlerts } from "@/lib/security";
import styles from "../admin.module.css";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata = { title: "Security" };

const access = (email: string) => `/admin/access?email=${encodeURIComponent(email)}`;

// How codes and accounts are protected, and the signals that someone may be sharing them.
export default async function SecurityPage() {
  await requireAdmin("security");
  const { manyPlaces, guessing, hoarding, adminFails } = await sharingAlerts();
  return (
    <>
      <div className={styles.titleRow}>
        <div>
          <h1 className="h2">Security</h1>
          <p className="hint">Signals worth a look. None of them blocks anyone by itself: open the teacher in Access to revoke, move a seat or sign them out.</p>
        </div>
      </div>

      <section className={`card ${styles.panel}`} aria-labelledby="how-h" style={{ marginBottom: 32 }}>
        <h2 id="how-h" className="h4">
          How sharing is prevented
        </h2>
        <ul className="stack" style={{ gap: 6 }}>
          <li>Each kit code works once and unlocks only the teacher who redeems it (a personal seat). A code passed to a colleague is already used.</li>
          <li>Codes are 60-bit random, and wrong guesses are limited to 10 per teacher every 15 minutes.</li>
          <li>Joining a school with its join code needs the school admin&apos;s approval before any school-wide license applies.</li>
          <li>A teacher can be signed in on at most 3 devices; signing in on a 4th signs out the oldest, so one login can&apos;t serve a department.</li>
          <li>Sign-in is through real Google (or Clever / ClassLink) accounts only. Every sign-in is logged with a hash of the network, never the address itself.</li>
        </ul>
      </section>

      <Alert title="One account used from many networks (last 30 days)" empty="No account signed in from 5 or more networks.">
        {manyPlaces.map((r) => (
          <li key={r.teacherId}>
            <Link className="link" href={access(r.email)}>
              {r.email}
            </Link>{" "}
            <span className="hint">
              {r.places} networks, {r.signIns} sign-ins
            </span>
          </li>
        ))}
      </Alert>
      <Alert title="Several codes for the same kit on one account" empty="No account holds two codes for the same kit.">
        {hoarding.map((r) => (
          <li key={`${r.email}-${r.kit}`}>
            <Link className="link" href={access(r.email)}>
              {r.email}
            </Link>{" "}
            <span className="hint">
              {r.seats} codes for {r.kit} (codes bought for colleagues may have been redeemed by one person)
            </span>
          </li>
        ))}
      </Alert>
      <Alert title="Many wrong codes (last 7 days)" empty="Nobody entered 5 or more wrong codes.">
        {guessing.map((r) => (
          <li key={r.email}>
            <Link className="link" href={access(r.email)}>
              {r.email}
            </Link>{" "}
            <span className="hint">{r.fails} wrong codes</span>
          </li>
        ))}
      </Alert>
      <Alert title="Studio sign-in failures (last 7 days)" empty="No failed Studio sign-ins.">
        {adminFails.map((r, i) => (
          <li key={i}>
            <span className="mono">{r.at.toLocaleString()}</span> · {r.who} · {r.action === "admin.locked" ? "account locked for 15 minutes" : "wrong password"}
          </li>
        ))}
      </Alert>
    </>
  );
}

function Alert({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className={styles.section}>
      <h2 className="h4">{title}</h2>
      {children.length ? <ul className="stack" style={{ gap: 6 }}>{children}</ul> : <p className="hint">{empty}</p>}
    </section>
  );
}
