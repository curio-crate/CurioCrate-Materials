"use client";

import { useState } from "react";
import { FILTER_MATERIALS, runFilter, type Material } from "@/lib/labs";
import type { LabResult } from "./LuminolLab";
import styles from "./labs.module.css";

const ALL = Object.keys(FILTER_MATERIALS) as Material[];

export function FilterLab({ onSave }: { onSave: (r: LabResult) => Promise<void> }) {
  const [layers, setLayers] = useState<Material[]>(["sand", "gravel", "cotton"]);
  const [result, setResult] = useState<ReturnType<typeof runFilter> | null>(null);
  const [trials, setTrials] = useState(0);
  const move = (i: number, d: -1 | 1) => setLayers((l) => { const n = [...l]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });

  return (
    <div className={styles.lab}>
      <div className={styles.stage}>
        <svg viewBox="0 0 360 300" className={styles.svg} role="img" aria-label={`Filter column, top to bottom: ${layers.map((m) => FILTER_MATERIALS[m].label).join(", ")}.${result ? ` Output ${result.ntu} NTU.` : ""}`}>
          <path d="M110 10 h80 l-10 30 h-60 z" className={styles.dirty} />
          <rect x="100" y="48" width="100" height={layers.length * 44 + 8} rx="8" fill="none" stroke="currentColor" opacity="0.4" />
          {layers.map((m, i) => <rect key={i} x="104" y={52 + i * 44} width="92" height="40" className={styles[`m_${m}`]} />)}
          <rect x="230" y="200" width="70" height="80" rx="6" fill="none" stroke="currentColor" opacity="0.4" />
          {result && <rect x="234" y={210} width="62" height="66" rx="3" className={result.ntu < 10 ? styles.water : styles.dirty} opacity={Math.min(1, 0.3 + result.ntu / 60)} />}
          <text x="265" y="296" textAnchor="middle" className={styles.label}>{result ? `${result.ntu} NTU` : "OUTPUT"}</text>
        </svg>
      </div>
      <div className={styles.panel}>
        <h2 className="h4">Layers, top to bottom</h2>
        <ol className={styles.layers}>
          {layers.map((m, i) => (
            <li key={i} className={styles.layerRow}>
              <span className={`${styles.layerSwatch} ${styles[`m_${m}`]}`} aria-hidden="true" />
              <label className="sr-only" htmlFor={`layer-${i}`}>Layer {i + 1}</label>
              <select id={`layer-${i}`} className="select" value={m} onChange={(e) => setLayers((l) => l.map((x, j) => (j === i ? (e.target.value as Material) : x)))}>
                {ALL.map((a) => <option key={a} value={a}>{FILTER_MATERIALS[a].label} (${FILTER_MATERIALS[a].cost.toFixed(2)})</option>)}
              </select>
              <button type="button" className="btn btn-xs" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move layer ${i + 1} up`}>↑</button>
              <button type="button" className="btn btn-xs" onClick={() => setLayers((l) => l.filter((_, j) => j !== i))} aria-label={`Remove layer ${i + 1}`}>✕</button>
            </li>
          ))}
        </ol>
        <div className="row">
          <button type="button" className="btn btn-xs" disabled={layers.length >= 5} onClick={() => setLayers((l) => [...l, "charcoal"])}>+ Add layer</button>
          <button type="button" className="btn btn-kit" disabled={!layers.length} onClick={() => { setResult(runFilter(layers)); setTrials((t) => t + 1); }}>Pour the sample</button>
        </div>
        <div className={styles.status} role="status" aria-live="polite">
          {result ? (
            <div className={styles.chips}>
              <span className={result.pass.clarity ? styles.pass : styles.fail}>{result.ntu} NTU {result.pass.clarity ? "✓" : "✕"} (&lt;10)</span>
              <span className={result.pass.flow ? styles.pass : styles.fail}>{result.flow} mL/min {result.pass.flow ? "✓" : "✕"} (≥50)</span>
              <span className={result.pass.cost ? styles.pass : styles.fail}>${result.cost.toFixed(2)} {result.pass.cost ? "✓" : "✕"} (≤$2)</span>
            </div>
          ) : "Design a filter, then pour a 100 NTU sample through it."}
        </div>
        <button type="button" className="btn btn-solid" disabled={!result} onClick={() => result && onSave({ layers: layers.join(">"), ntu: result.ntu, flow: result.flow, cost: result.cost, trials })}>Save design</button>
      </div>
    </div>
  );
}
