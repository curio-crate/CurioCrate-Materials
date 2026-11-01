// Kit types and the parts & pricing catalog of a physical kit. Shared by the server and the Studio parts editor
// (which totals prices live), so nothing here touches the database.

export const KIT_KINDS = ["physical", "online"] as const;
export type KitKind = (typeof KIT_KINDS)[number];
export const asKitKind = (v: unknown): KitKind => (v === "online" ? "online" : "physical");

export const KIT_KIND: Record<KitKind, { label: string; icon: string; blurb: string }> = {
  physical: { label: "Physical kit", icon: "box", blurb: "A box schools receive. Curriculum adds its parts and components; you get a parts & pricing catalog." },
  online: { label: "Online kit", icon: "interactive", blurb: "Runs in the browser. Upload its HTML5 / JavaScript activities; Curriculum builds lessons around them." },
};

/** A kit created by a Product Officer that Curriculum hasn't published yet. Teachers never see drafts. */
export const isDraftKit = (k: { status: string }) => k.status === "draft";

export type Part = { name: string; quantity: number; unitCostCents: number | null; supplier: string | null };

export const formatCents = (cents: number | null | undefined) =>
  cents == null ? "—" : (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "$1,234.5" / "12" / "" -> cents (null when empty or not a price). */
export function parseDollars(v: unknown): number | null {
  const t = String(v ?? "").replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Cost of one kit, and whether every part has a price (otherwise the total is a minimum). */
export function partsTotal(parts: Pick<Part, "quantity" | "unitCostCents">[]) {
  return {
    cents: parts.reduce((sum, p) => sum + (p.unitCostCents ?? 0) * p.quantity, 0),
    unpriced: parts.filter((p) => p.unitCostCents == null).length,
  };
}

/** "$9.75", "$9.75+" (some parts have no price yet) or "Not priced yet". */
export function costText(total: ReturnType<typeof partsTotal>, parts: number) {
  if (!parts || total.unpriced === parts) return "Not priced yet";
  return `${formatCents(total.cents)}${total.unpriced ? "+" : ""}`;
}

/** What teachers see as "In the box": part names and quantities, never prices or suppliers. */
export const inTheBoxFrom = (parts: Pick<Part, "name" | "quantity">[]) => parts.map((p) => (p.quantity > 1 ? `${p.quantity} × ${p.name}` : p.name));

/** Trims and bounds a parts list from the editor. Rows without a name are dropped. */
export function cleanParts(rows: unknown): Part[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: Partial<Record<keyof Part, unknown>>) => ({
      name: String(r?.name ?? "").trim().slice(0, 160),
      quantity: Math.min(100000, Math.max(1, Math.round(Number(r?.quantity) || 1))),
      unitCostCents: r?.unitCostCents == null || r.unitCostCents === "" ? null : Math.min(100_000_000, Math.max(0, Math.round(Number(r.unitCostCents)) || 0)),
      supplier: String(r?.supplier ?? "").trim().slice(0, 200) || null,
    }))
    .filter((p) => p.name)
    .slice(0, 300);
}
