import { sql } from "drizzle-orm";
import { db, dbKind } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const d = await db();
    await d.execute(sql`select 1`);
    return Response.json({ ok: true, db: dbKind() });
  } catch (e) {
    console.error("health check failed", e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
