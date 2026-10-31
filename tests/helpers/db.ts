import { __setDbForTests, connectPglite, type DB } from "@/db";

/** A fresh in-memory PostgreSQL (PGlite) with all migrations applied and the catalog seeded. */
export async function freshDb(): Promise<DB> {
  const db = await connectPglite(undefined);
  __setDbForTests(db);
  return db;
}
