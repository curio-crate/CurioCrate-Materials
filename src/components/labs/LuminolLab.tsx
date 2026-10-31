"use client";

import { useState } from "react";
import { luminolGlow } from "@/lib/labs";
import styles from "./labs.module.css";

const DILUTION = ["1 in 100", "1 in 1,000", "1 in 10,000", "1 in 100,000", "1 in 1,000,000", "water only"];
const describe = (g: number) => (g === 0 ? "no glow at all" : g > 0.6 ? "a bright blue glow" : g > 0.3 ? "a dim blue glow" : "a faint, barely-there glow");

export type LabResult = Record<string, number | string | boolean | number[]>;

export function LuminolLab({ onSave }: { onSave: (r: LabResult) => Promise<void> }) {
  const [room, setRoom] = useState<"dark" | "dim">("dark");
  const [tube, setTube] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [ratings, setRatings] = useState<(number | null)[]>(Array(6).fill(null));
  const [limit, setLimit] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const glow = tube && added ? luminolGlow(tube, room) : 0;
  const status = !tube ? "Choose a tube to put in the blackout sleeve." : !added ? `Tube ${tube} (${DILUTION[tube - 1]}) is in the sleeve. Add three drops of mixed solution.` : `Tube ${tube}: you see ${describe(glow)}.`;

  return (
    <div className={styles.lab}>
      <div className={`${styles.stage} ${styles.stageDark}`}>
        <svg viewBox="0 0 400 260" className={styles.svg} role="img" aria-label={status}>
          <rect x="120" y="20" width="160" height="220" rx="16" fill="none" stroke="currentColor" opacity="0.15" />
          {tube && (
            <g transform="translate(184 40)">
              <circle cx="16" cy="130" r={20 + glow * 40} className={styles.tubeGlow} opacity={glow} />
              <path d="M2 0 h28 v150 a14 14 0 0 1 -28 0 z" className={styles.tubeGlass} />
              {added && <path d="M5 90 h22 v60 a11 11 0 0 1 -22 0 z" className={styles.tubeLiquid} opacity={0.08 + glow * 0.92} />}
              <text x="16" y="190" textAnchor="middle" className={styles.label}>TUBE {tube}</text>
            </g>
          )}
          <text x="200" y="252" textAnchor="middle" className={styles.label}>BLACKOUT SLEEVE · ROOM {room.toUpperCase()}</text>
        </svg>
      </div>
      <div className={styles.panel}>
        <fieldset className={styles.group}>
          <legend>Room lights</legend>
          <div className={styles.seg}>
            {(["dark", "dim"] as const).map((r) => (
              <label key={r}><input className="sr-only" type="radio" name="room" checked={room === r} onChange={() => setRoom(r)} /> {r === "dark" ? "Lights off" : "Lights dimmed"}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend>Tube in the sleeve</legend>
          <div className={styles.tubes}>
            {DILUTION.map((d, i) => (
              <button key={d} type="button" className={styles.tubeBtn} aria-pressed={tube === i + 1} onClick={() => { setTube(i + 1); setAdded(false); }}>
                <span className="mono">{i + 1}</span>
                <span className="hint">{d}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="btn btn-kit" disabled={!tube || added} onClick={() => setAdded(true)}>Add three drops</button>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
        {tube && added && (
          <fieldset className={styles.group}>
            <legend>Rate tube {tube}</legend>
            <div className={styles.seg}>
              {[0, 1, 2, 3].map((n) => (
                <label key={n}><input className="sr-only" type="radio" name={`rate-${tube}`} checked={ratings[tube - 1] === n} onChange={() => setRatings((r) => r.map((v, i) => (i === tube - 1 ? n : v)))} /> {["0 none", "1 barely", "2 dim", "3 bright"][n]}</label>
              ))}
            </div>
          </fieldset>
        )}
        <table className={styles.table}>
          <caption className="sr-only">Evidence log</caption>
          <thead><tr><th scope="col">Tube</th>{DILUTION.map((_, i) => <th key={i} scope="col">{i + 1}</th>)}</tr></thead>
          <tbody><tr><th scope="row">Glow</th>{ratings.map((r, i) => <td key={i}>{r ?? "—"}</td>)}</tr></tbody>
        </table>
        <div className="field">
          <label className="label" htmlFor="limit">Our limit of detection: last tube that glowed</label>
          <select id="limit" className="select" value={limit} onChange={(e) => setLimit(e.target.value)}>
            <option value="">Choose…</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Tube {n} ({DILUTION[n - 1]})</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-solid" disabled={!limit || ratings.every((r) => r === null)} onClick={async () => { await onSave({ room, ratings: ratings.map((r) => r ?? -1), limit: Number(limit) }); setSaved(`Saved. Your limit: tube ${limit}.`); }}>Save results</button>
        <p aria-live="polite" className="hint">{saved}</p>
      </div>
    </div>
  );
}
