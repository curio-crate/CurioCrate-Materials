import styles from "./KitArt.module.css";

// Decorative kit illustrations (pure SVG, colors from theme tokens via CSS module).
export function KitArt({ kit, className = "" }: { kit: string; className?: string }) {
  if (kit === "circuits") return <CircuitArt className={className} />;
  if (kit === "clean-water") return <WaterArt className={className} />;
  return <TubesArt className={className} />;
}

function TubesArt({ className }: { className: string }) {
  // Six numbered tubes, glow fading tube by tube (the serial dilution from the manual).
  const glow = [1, 0.8, 0.55, 0.32, 0.14, 0.04];
  return (
    <svg viewBox="0 0 360 220" className={`${styles.art} ${className}`} aria-hidden="true" focusable="false">
      <ellipse cx="180" cy="190" rx="170" ry="22" className={styles.lumHalo} />
      {glow.map((g, i) => {
        const x = 40 + i * 52;
        return (
          <g key={i} transform={`translate(${x} 34)`}>
            <circle cx="14" cy="100" r="22" className={styles.tubeGlow} opacity={g * 0.7} />
            <rect x="2" y="0" width="24" height="10" rx="2" className={styles.cap} />
            <rect x="8" y="2" width="12" height="6" rx="1" className={styles.capLabel} />
            <path d="M4 10 h20 v110 a10 10 0 0 1 -20 0 z" className={styles.tube} />
            <path d="M6 70 h16 v50 a8 8 0 0 1 -16 0 z" className={styles.liquid} opacity={0.18 + g * 0.82} />
            <text x="14" y="160" textAnchor="middle" className={styles.num}>
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CircuitArt({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 360 220" className={`${styles.art} ${className}`} aria-hidden="true" focusable="false">
      <circle cx="250" cy="70" r="58" className={styles.bulbHalo} />
      <path d="M60 150 H130 M190 150 H250 V108" className={styles.wire} />
      <path d="M60 150 V70 H218" className={styles.wire} />
      <rect x="128" y="132" width="64" height="36" rx="6" className={styles.battery} />
      <rect x="192" y="143" width="6" height="14" rx="1" className={styles.batteryTip} />
      <text x="160" y="155" textAnchor="middle" className={styles.batteryText}>
        +  1.5V  −
      </text>
      <circle cx="250" cy="70" r="30" className={styles.bulb} />
      <path d="M238 76 q12 -22 24 0" className={styles.filament} />
      <rect x="238" y="98" width="24" height="12" rx="2" className={styles.base} />
      <circle cx="60" cy="150" r="5" className={styles.node} />
      <circle cx="60" cy="70" r="5" className={styles.node} />
      <path d="M86 70 l18 -12" className={styles.switch} />
      <circle cx="86" cy="70" r="4" className={styles.node} />
      <circle cx="108" cy="70" r="4" className={styles.node} />
    </svg>
  );
}

function WaterArt({ className }: { className: string }) {
  const layers = [
    { y: 64, h: 22, cls: styles.cotton },
    { y: 86, h: 30, cls: styles.charcoal },
    { y: 116, h: 30, cls: styles.sand },
    { y: 146, h: 26, cls: styles.gravel },
  ];
  return (
    <svg viewBox="0 0 360 220" className={`${styles.art} ${className}`} aria-hidden="true" focusable="false">
      <ellipse cx="180" cy="196" rx="150" ry="18" className={styles.waterHalo} />
      <path d="M120 20 h60 l-8 30 h-44 z" className={styles.dirty} />
      <rect x="130" y="56" width="100" height="122" rx="8" className={styles.column} />
      {layers.map((l, i) => (
        <rect key={i} x="134" y={l.y} width="92" height={l.h} className={l.cls} />
      ))}
      <path d="M170 178 v10 M180 178 v16 M190 178 v10" className={styles.drip} />
      <rect x="250" y="120" width="60" height="70" rx="6" className={styles.glass} />
      <rect x="254" y="148" width="52" height="38" rx="3" className={styles.clean} />
      <text x="280" y="210" textAnchor="middle" className={styles.num}>
        NTU 4
      </text>
    </svg>
  );
}
