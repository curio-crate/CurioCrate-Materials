"use client";

import { useState } from "react";
import { bulbBrightness } from "@/lib/labs";
import type { LabResult } from "./LuminolLab";
import styles from "./labs.module.css";

const word = (b: number) => (b === 0 ? "off" : b >= 0.9 ? "very bright" : b >= 0.45 ? "bright" : b >= 0.2 ? "dim" : "very dim");

export function CircuitLab({ onSave }: { onSave: (r: LabResult) => Promise<void> }) {
  const [layout, setLayout] = useState<"series" | "parallel">("series");
  const [bulbs, setBulbs] = useState(2);
  const [batteries, setBatteries] = useState(1);
  const [closed, setClosed] = useState(false);
  const [removed, setRemoved] = useState([false, false, false]);
  const [log, setLog] = useState<string[]>([]);
  const b = bulbBrightness(layout, bulbs, batteries, closed, removed);
  const status = closed ? `Switch closed. ${b.map((x, i) => `Bulb ${i + 1}${removed[i] ? " (unscrewed)" : ""}: ${word(x)}`).join(". ")}.` : "Switch open. No complete path, so no bulbs are lit.";
  const xs = [[230], [170, 290], [140, 230, 320]][bulbs - 1];

  return (
    <div className={styles.lab}>
      <div className={styles.stage}>
        <svg viewBox="0 0 420 280" className={styles.svg} role="img" aria-label={status}>
          <rect x="30" y="200" width="70" height="34" rx="6" className={styles.battery} />
          <text x="65" y="222" textAnchor="middle" className={styles.label}>{(1.5 * batteries).toFixed(1)}V</text>
          {layout === "series" ? (
            <path d="M100 217 H380 V60 H30 V200" className={`${styles.wire} ${closed && b.some((x) => x > 0) ? styles.wireLive : ""}`} />
          ) : (
            <>
              <path d="M100 217 H380 V60 H30 V200" className={`${styles.wire} ${closed && b.some((x) => x > 0) ? styles.wireLive : ""}`} />
              {xs.map((x) => <path key={x} d={`M${x} 60 V217`} className={`${styles.wire} ${closed ? styles.wireLive : ""}`} />)}
            </>
          )}
          <g>
            <circle cx="30" cy="130" r="5" fill="currentColor" />
            <path d={closed ? "M30 130 L30 165" : "M30 130 L55 158"} stroke="currentColor" strokeWidth="3" />
            <text x="45" y="150" className={styles.label}>{closed ? "" : "OPEN"}</text>
          </g>
          {xs.map((x, i) => (
            <g key={i} transform={`translate(${x} ${layout === "series" ? 60 : 140})`}>
              <circle r={30} className={styles.halo} opacity={b[i]} />
              <circle r={16} className={styles.bulbGlass} />
              <circle r={14} className={styles.bulbGlow} opacity={b[i]} />
              <text y={34} textAnchor="middle" className={styles.label}>{removed[i] ? "UNSCREWED" : `BULB ${i + 1}`}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.panel}>
        <fieldset className={styles.group}>
          <legend>Wiring</legend>
          <div className={styles.seg}>
            {(["series", "parallel"] as const).map((l) => <label key={l}><input className="sr-only" type="radio" name="layout" checked={layout === l} onChange={() => setLayout(l)} /> {l}</label>)}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend>Bulbs</legend>
          <div className={styles.seg}>
            {[1, 2, 3].map((n) => <label key={n}><input className="sr-only" type="radio" name="bulbs" checked={bulbs === n} onChange={() => setBulbs(n)} /> {n}</label>)}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend>Batteries (1.5 V each)</legend>
          <div className={styles.seg}>
            {[1, 2].map((n) => <label key={n}><input className="sr-only" type="radio" name="batteries" checked={batteries === n} onChange={() => setBatteries(n)} /> {n}</label>)}
          </div>
        </fieldset>
        <div className="row">
          <button type="button" className="btn btn-kit" aria-pressed={closed} onClick={() => setClosed((c) => !c)}>{closed ? "Open the switch" : "Close the switch"}</button>
          {Array.from({ length: bulbs }, (_, i) => (
            <button key={i} type="button" className="btn btn-xs" aria-pressed={removed[i]} onClick={() => setRemoved((r) => r.map((v, j) => (j === i ? !v : v)))}>{removed[i] ? `Screw in bulb ${i + 1}` : `Unscrew bulb ${i + 1}`}</button>
          ))}
        </div>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
        <button type="button" className="btn btn-sm" onClick={() => setLog((l) => [...l, `${layout}, ${bulbs} bulb(s), ${batteries} battery: ${closed ? b.map(word).join(" / ") : "switch open"}`])}>Record this observation</button>
        <ol className="hint" style={{ paddingLeft: 18 }}>{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
        <button type="button" className="btn btn-solid" disabled={!log.length} onClick={async () => { await onSave({ observations: log.length, last: log[log.length - 1] }); setLog((l) => [...l]); }}>Save results</button>
      </div>
    </div>
  );
}
