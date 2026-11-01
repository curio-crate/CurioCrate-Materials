import { isAdmin } from "@/lib/auth/viewer";
import { partsTotal } from "@/lib/kit-parts";
import { getStudioKit, partsOf } from "@/lib/kit-studio";

const cell = (s: string | number | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const dollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

// The parts & pricing catalog of a physical kit as a spreadsheet (Product Officers).
export async function GET(_req: Request, ctx: RouteContext<"/admin/kits/[id]/parts.csv">) {
  if (!(await isAdmin("kits"))) return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const kit = await getStudioKit(id);
  if (!kit) return new Response("Not found", { status: 404 });
  const parts = await partsOf(kit.id);
  const rows: (string | number | null)[][] = [
    ["part", "quantity_per_kit", "unit_price_usd", "line_total_usd", "supplier"],
    ...parts.map((p) => [p.name, p.quantity, dollars(p.unitCostCents), p.unitCostCents == null ? "" : dollars(p.unitCostCents * p.quantity), p.supplier]),
    ["Cost per kit", "", "", dollars(partsTotal(parts).cents), ""],
  ];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="curiocrate-${kit.slug}-parts.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
