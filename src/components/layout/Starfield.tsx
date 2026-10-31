import styles from "./Starfield.module.css";

// Deterministic star field matching curiocrate.org's night sky. Rendered once as box-shadows
// on two 1px elements (cheap to paint on low-end Chromebooks; no canvas, no JS on the client).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stars(seed: number, count: number, w: number, h: number) {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * w);
    const y = Math.round(rand() * h);
    const blur = rand() > 0.85 ? 2 : 0;
    out.push(`${x}px ${y}px ${blur}px currentColor`);
  }
  return out.join(",");
}

const SMALL = stars(7, 160, 2400, 1600);
const BRIGHT = stars(23, 34, 2400, 1600);
const GLOWS = stars(91, 9, 2400, 1600).replace(/ (\d)px currentColor/g, " 40px 6px currentColor");

export function Starfield() {
  return (
    <div className={styles.sky} aria-hidden="true" data-print="hide">
      <span className={styles.small} style={{ boxShadow: SMALL }} />
      <span className={styles.bright} style={{ boxShadow: BRIGHT }} />
      <span className={styles.glows} style={{ boxShadow: GLOWS }} />
    </div>
  );
}
