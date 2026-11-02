"use client";

import { useState } from "react";

/**
 * Assign / unassign one item to one class. Flips instantly (optimistic) and saves in the background through
 * /api/classes/assign; if saving fails it flips back and says so. Without JavaScript the surrounding form posts to the
 * server action instead, so it works either way.
 */
export function AssignSwitch({
  classId,
  contentId,
  slug,
  title,
  initial,
  action,
  label,
}: {
  classId: string;
  contentId: string;
  slug: string;
  title: string;
  initial: boolean;
  action?: (form: FormData) => void | Promise<void>;
  /** Visible text next to the switch (e.g. the class name). The accessible name always says what pressing does. */
  label?: string;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(false);
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("slug", slug);
    fd.set("on", next ? "1" : "0");
    // keepalive: the save finishes even if the teacher leaves the page right away.
    const ok = await fetch("/api/classes/assign", { method: "POST", body: fd, keepalive: true })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) {
      setOn(!next);
      setError(true);
    }
    setBusy(false);
  }

  const button = (
    <button type="submit" className="sx-switch" aria-pressed={on} aria-busy={busy || undefined} aria-label={`${on ? "Unassign" : "Assign"} ${title}${label ? ` ${on ? "from" : "to"} ${label}` : ""}`} onClick={toggle} />
  );
  return (
    <form action={action} style={{ display: "contents" }}>
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      {button}
      <span className="sr-only" aria-live="polite">
        {error ? `Couldn't save. ${title} is still ${on ? "assigned" : "not assigned"}.` : ""}
      </span>
    </form>
  );
}
