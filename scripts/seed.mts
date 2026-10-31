// Seeds the catalog into DATABASE_URL (or the local PGlite database). Safe to run repeatedly.
// Usage: npm run db:seed
import { connectPglite } from "../src/db";

if (process.env.DATABASE_URL) {
  await import("./db-migrate.mjs");
} else {
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  await connectPglite(dir);
  console.log(`db:seed: PGlite at ${dir} migrated and seeded`);
}
