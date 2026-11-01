import Link from "next/link";
import { NGSS_LABELS } from "@/content/kits";
import { TIER_LABEL, TYPE_LABEL, type ContentItem } from "@/lib/content";
import { Icon } from "../ui/Icon";
import styles from "./content.module.css";

export function TierBadge({ tier }: { tier: ContentItem["requiredTier"] }) {
  const cls = tier === "free" ? "badge-free" : tier === "kit_owner" ? "badge-kit" : "badge-sub";
  return <span className={`badge ${cls}`}>{TIER_LABEL[tier]}</span>;
}

/** NGSS alignment, shown the same way everywhere: a small check-marked "NGSS" label, then the codes. */
export function NgssTags({ codes, limit }: { codes: string[]; limit?: number }) {
  if (!codes.length) return null;
  const shown = limit ? codes.slice(0, limit) : codes;
  return (
    <ul className={styles.ngss} aria-label="NGSS standards">
      <li className={styles.ngssLabel} aria-hidden="true">
        <Icon name="ngss" size={13} /> NGSS
      </li>
      {shown.map((c) => (
        <li key={c} className={styles.ngssTag} title={NGSS_LABELS[c]}>
          {c}
          {NGSS_LABELS[c] && <span className="sr-only">: {NGSS_LABELS[c]}</span>}
        </li>
      ))}
      {limit && codes.length > limit && <li className={styles.ngssMore}>+{codes.length - limit}</li>}
    </ul>
  );
}

export type RowState = "open" | "locked" | "signin";

/** One content item in a list, with its lock state for the current viewer. */
export function ContentRow({ item, href, state, kitName }: { item: ContentItem; href: string; state: RowState; kitName?: string }) {
  return (
    <li className={`${styles.row} ${state !== "open" ? styles.rowLocked : ""}`}>
      <span className={`${styles.typeIcon} ${styles[`t_${item.type}`]}`} aria-hidden="true">
        <Icon name={item.type} size={20} />
      </span>
      <div className={styles.rowBody}>
        <div className={styles.rowMeta}>
          <span className="eyebrow">
            {kitName ? `${kitName} · ` : ""}
            {TYPE_LABEL[item.type]}
            {item.section ? ` · ${item.section}` : ""}
          </span>
        </div>
        <Link href={href} className={styles.rowTitle}>
          {item.title}
          <span className="sr-only">{state === "locked" ? " (locked)" : state === "signin" ? " (sign in to open)" : ""}</span>
        </Link>
        <p className={styles.rowSummary}>{item.summary}</p>
        <div className={styles.rowFoot}>
          {item.minutes && (
            <span className={styles.minutes}>
              <Icon name="clock" size={14} /> {item.minutes} min
            </span>
          )}
          <NgssTags codes={item.ngss} limit={3} />
        </div>
      </div>
      <span className={styles.state} aria-hidden="true">
        {state === "locked" || (state === "signin" && item.requiredTier !== "free") ? <Icon name="lock" size={18} /> : <Icon name="arrow" size={18} />}
      </span>
    </li>
  );
}

export function LockedPanel({
  reason,
  kitSlug,
  kitName,
  next,
  tier = "free",
}: {
  reason: "sign_in" | "needs_kit" | "needs_subscription" | "not_assigned" | "student_locked";
  kitSlug?: string | null;
  kitName?: string | null;
  next: string;
  tier?: ContentItem["requiredTier"];
}) {
  const signInText =
    tier === "free"
      ? "Sign in to open this. Teachers use their school account; students use their class code or a free student account."
      : tier === "kit_owner"
        ? `This is part of the ${kitName ?? "kit"}. Teachers: sign in to see whether you already have it.`
        : "This is included with a subscription. Sign in to see whether your school has one.";
  const copy = {
    sign_in: { title: "Sign in to open this", text: signInText, cta: { href: `/signin?next=${encodeURIComponent(next)}`, label: "Teacher sign in" } },
    needs_kit: { title: `Part of the ${kitName ?? "kit"}`, text: "This unlocks on your account when you redeem the code that came in your kit box. A subscription also unlocks it.", cta: { href: "/redeem", label: "Redeem a kit code" } },
    needs_subscription: { title: "Included with a subscription", text: "Teacher training and new content come with a teacher, school or district subscription.", cta: { href: "/plans", label: "See plans" } },
    not_assigned: { title: "Not assigned to your class", text: "Ask your teacher to assign this. You can open everything on your class page.", cta: { href: "/class", label: "Back to my class" } },
    student_locked: { title: "Your teacher can share this one", text: "Student accounts open the free lessons and labs. Ask your teacher to assign this one to your class.", cta: { href: "/student", label: "Back to my learning" } },
  }[reason];
  return (
    <section className={`card ${styles.locked}`} aria-labelledby="locked-title">
      <span className={styles.lockIcon} aria-hidden="true">
        <Icon name="lock" size={26} />
      </span>
      <h2 id="locked-title" className="h3">
        {copy.title}
      </h2>
      <p className="muted">{copy.text}</p>
      <div className="row">
        <Link href={copy.cta.href} className="btn btn-solid">
          {copy.cta.label}
        </Link>
        {reason === "sign_in" && tier === "free" && (
          <Link href="/join" className="btn">
            I&apos;m a student
          </Link>
        )}
        {reason === "needs_kit" && kitSlug && (
          <Link href={`/kits/${kitSlug}`} className="btn">
            Back to the kit
          </Link>
        )}
        {reason === "needs_kit" && (
          <Link href="/plans" className="btn">
            Plans
          </Link>
        )}
      </div>
    </section>
  );
}
