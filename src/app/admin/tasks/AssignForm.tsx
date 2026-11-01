"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { assignTaskAction } from "./actions";

type Director = { id: string; name: string; roleLabel: string; department: string };

const pad = (n: number) => String(n).padStart(2, "0");
/** Tomorrow at 5 pm, in the browser's own time zone, as a datetime-local value. */
function tomorrowFive() {
  const d = new Date(Date.now() + 86400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`;
}

// The deadline is picked in the head's own time zone and sent as an exact moment (ISO), so everyone sees the same
// deadline in their own local time.
export function AssignForm({ directors, dept }: { directors: Director[]; dept: string }) {
  const [due, setDue] = useState(tomorrowFive);
  const iso = (() => {
    const t = new Date(due);
    return Number.isNaN(t.getTime()) ? "" : t.toISOString();
  })();
  const groups = ["Curriculum", "Production"].map((g) => ({ g, people: directors.filter((d) => d.department === g) })).filter((x) => x.people.length);
  return (
    <form action={assignTaskAction} className="st-card stack" style={{ gap: 14 }} aria-labelledby="assign-h">
      <div>
        <h2 id="assign-h" className="st-h2">
          Give a to-do
        </h2>
        <p className="hint">Goes to a Director of Curriculum or a Product Officer. Their department sees it with the deadline and who gave it; you&apos;re notified when it&apos;s done.</p>
      </div>
      <input type="hidden" name="d" value={dept} />
      <input type="hidden" name="due" value={iso} />
      <div className="field">
        <label className="label" htmlFor="task-title">
          To-do
        </label>
        <input id="task-title" name="title" className="input" required minLength={3} maxLength={200} placeholder="e.g. Finish the Magnetism teacher manual" />
      </div>
      <div className="st-fields">
        <div className="field">
          <label className="label" htmlFor="task-who">
            Give to
          </label>
          <select id="task-who" name="assignee" className="select" required defaultValue="">
            <option value="" disabled>
              {directors.length ? "Choose a person" : "No Directors of Curriculum or Product Officers yet"}
            </option>
            {groups.map(({ g, people }) => (
              <optgroup key={g} label={g}>
                {people.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.roleLabel})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="task-due">
            Deadline
          </label>
          <input id="task-due" type="datetime-local" className="input" required value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="task-notes">
          Notes <span className="hint">(optional)</span>
        </label>
        <textarea id="task-notes" name="notes" className="textarea" rows={2} maxLength={2000} />
      </div>
      <div>
        <button className="btn btn-solid" disabled={!directors.length || !iso}>
          <Icon name="send" size={16} /> Give to-do
        </button>
      </div>
    </form>
  );
}
