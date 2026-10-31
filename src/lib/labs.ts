// Registry of browser labs. Each lab is a React component in src/components/labs.
export const LABS = [
  { slug: "luminol-limit", title: "Find Your Limit: serial dilution lab", kit: "luminol", contentSlug: "luminol-limit-lab", intro: "Test six tubes in the blackout sleeve and find the faintest stain the luminol test can see." },
  { slug: "circuit-sandbox", title: "Circuit Sandbox", kit: "circuits", contentSlug: "circuits-sandbox-lab", intro: "Build series and parallel circuits and see how energy moves to the bulbs." },
  { slug: "filter-designer", title: "Filter Designer", kit: "clean-water", contentSlug: "water-filter-lab", intro: "Stack filter layers, run a sample, and balance clarity, flow and cost." },
] as const;

export type LabSlug = (typeof LABS)[number]["slug"];
export const labBySlug = (slug: string) => LABS.find((l) => l.slug === slug) ?? null;

// ---------- Lab science models (pure, unit-tested) ----------

/** Luminol glow (0..1) for tube 1..6 (1:100 .. 1:1,000,000, tube 6 = water) under room light. */
export function luminolGlow(tube: number, room: "dark" | "dim") {
  if (tube >= 6) return 0;
  const exponent = tube + 1; // tube 1 = 10^-2 ... tube 5 = 10^-6
  const signal = Math.max(0, (7 - exponent) / 5); // log-linear fade
  const threshold = room === "dark" ? 0.02 : 0.35;
  return signal <= threshold ? 0 : Math.round(signal * 100) / 100;
}

/** Bulb brightness (0..1) in a circuit of n identical bulbs and b 1.5V cells. */
export function bulbBrightness(layout: "series" | "parallel", bulbs: number, batteries: number, closed: boolean, removed: boolean[]) {
  if (!closed) return Array(bulbs).fill(0);
  const v = 1.5 * batteries;
  if (layout === "series") {
    if (removed.slice(0, bulbs).some(Boolean)) return Array(bulbs).fill(0);
    const power = (v / bulbs) ** 2 / 2.25; // relative to one bulb on one cell
    return Array(bulbs).fill(Math.min(1, power / 4));
  }
  const power = v ** 2 / 2.25;
  return Array.from({ length: bulbs }, (_, i) => (removed[i] ? 0 : Math.min(1, power / 4)));
}

export const FILTER_MATERIALS = {
  gravel: { label: "Gravel", cost: 0.2, large: 0.7, fine: 0.05, dissolved: 0, flow: 1 },
  sand: { label: "Sand", cost: 0.3, large: 0.5, fine: 0.8, dissolved: 0.05, flow: 0.6 },
  charcoal: { label: "Charcoal", cost: 0.9, large: 0.1, fine: 0.4, dissolved: 0.8, flow: 0.75 },
  cotton: { label: "Cotton", cost: 0.15, large: 0.3, fine: 0.3, dissolved: 0, flow: 0.9 },
} as const;
export type Material = keyof typeof FILTER_MATERIALS;

/** Runs a 100 NTU sample through layers (top → bottom). */
export function runFilter(layers: Material[]) {
  let large = 60, fine = 40, color = 1;
  let flow = 160;
  let cost = 0;
  for (const m of layers) {
    const p = FILTER_MATERIALS[m];
    large *= 1 - p.large;
    fine *= 1 - p.fine;
    color *= 1 - p.dissolved;
    flow *= p.flow;
    cost += p.cost;
  }
  // Water enters at the top. Fine sand above coarse gravel traps the big particles and clogs.
  const s = layers.indexOf("sand");
  const g = layers.indexOf("gravel");
  if (s !== -1 && g !== -1 && s < g) flow *= 0.6;
  if (layers.length && layers[layers.length - 1] !== "cotton") {
    fine += 8; // media washes out without a cotton plug at the bottom
  }
  const ntu = Math.round((large + fine) * 10) / 10;
  return { ntu, flow: Math.round(flow), cost: Math.round(cost * 100) / 100, color: Math.round(color * 100) / 100, pass: { clarity: ntu < 10, flow: flow >= 50, cost: cost <= 2 } };
}
