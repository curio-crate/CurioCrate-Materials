import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };

type Holder = { db?: Promise<DB>; kind?: "postgres" | "pglite" };
const g = globalThis as unknown as { __ccDb?: Holder };
const holder: Holder = (g.__ccDb ??= {});

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

async function connectPostgres(url: string): Promise<DB> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), prepare: false });
  holder.kind = "postgres";
  return drizzle(client, { schema }) as unknown as DB;
}

/** Embedded Postgres (PGlite). Used when DATABASE_URL is not set: local dev, tests, demo deploys. */
export async function connectPglite(dataDir?: string, opts: { seed?: boolean } = {}): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) await mkdir(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  holder.kind = "pglite";
  if (opts.seed !== false) {
    const { ensureSeeded } = await import("./seed");
    await ensureSeeded(db as unknown as DB);
  }
  return db as unknown as DB;
}

export function db(): Promise<DB> {
  if (!holder.db) {
    const url = process.env.DATABASE_URL;
    if (!url && (process.env.VERCEL_ENV === "production" || process.env.REQUIRE_CLOUD === "1")) {
      throw new Error("DATABASE_URL is not set. The live site only runs on the cloud database, so accounts and uploads are never lost.");
    }
    const dir = process.env.PGLITE_DIR ?? (process.env.VERCEL ? undefined : path.join(process.cwd(), ".data", "pglite"));
    holder.db = url ? connectPostgres(url) : connectPglite(dir);
    holder.db.catch(() => (holder.db = undefined));
  }
  return holder.db;
}

export function dbKind() {
  return holder.kind ?? (process.env.DATABASE_URL ? "postgres" : "pglite");
}

/** Tests: swap in an isolated database. */
export function __setDbForTests(instance: DB) {
  holder.db = Promise.resolve(instance);
  holder.kind = "pglite";
}
