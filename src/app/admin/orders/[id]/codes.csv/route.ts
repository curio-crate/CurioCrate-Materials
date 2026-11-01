import { isAdmin } from "@/lib/auth/viewer";
import { formatCode } from "@/lib/codes";
import { env } from "@/lib/env";
import { getOrderWithCodes } from "@/lib/orders";

const cell = (s: string | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;

export async function GET(_req: Request, ctx: RouteContext<"/admin/orders/[id]/codes.csv">) {
  if (!(await isAdmin("codes"))) return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const data = await getOrderWithCodes(id);
  if (!data) return new Response("Not found", { status: 404 });
  const rows = [
    ["code", "kit", "status", "redeem_url", "redeemed_school"],
    ...data.codes.map(({ code, kitName, orgName }) => [formatCode(code.code), kitName, code.status, `${env.appUrl()}/redeem?code=${formatCode(code.code)}`, orgName ?? ""]),
  ];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="curiocrate-codes-${(data.order.reference ?? id.slice(0, 8)).replace(/[^\w-]/g, "_")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
