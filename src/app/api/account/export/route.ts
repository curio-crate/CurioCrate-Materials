import { accountData } from "@/lib/account";
import { getViewer } from "@/lib/auth/viewer";
import { json } from "@/lib/http";

// A teacher downloads everything we store about them.
export async function GET() {
  const v = await getViewer();
  if (!v) return json({ error: "sign_in" }, 401);
  const data = await accountData(v.teacher.id);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="curiocrate-my-data.json"', "Cache-Control": "no-store" },
  });
}
