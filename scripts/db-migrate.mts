// Applies SQL migrations in ./drizzle to DATABASE_URL, then seeds the catalog (idempotent).
// Runs as part of the Vercel build (see vercel.json). Without DATABASE_URL it does nothing: PGlite
// migrates itself on first connection.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { ensureSeeded } from "../src/db/seed";
import type { DB } from "../src/db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:migrate: DATABASE_URL not set; embedded PGlite migrates itself at runtime. Skipping.");
  process.exit(0);
}
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("db:migrate: migrations applied");
await ensureSeeded(db as unknown as DB);
console.log("db:migrate: catalog seeded");
await client.end();
