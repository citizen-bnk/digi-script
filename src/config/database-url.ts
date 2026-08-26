/**
 * Vercel's Postgres/Neon integration does not set `DATABASE_URL`. It sets
 * `POSTGRES_PRISMA_URL` (pooled, already carrying the pgbouncer parameters
 * Prisma wants), `POSTGRES_URL`, and `POSTGRES_URL_NON_POOLING`. Newer Neon
 * integrations use `DATABASE_URL` / `DATABASE_URL_UNPOOLED` instead.
 *
 * Prisma reads `DATABASE_URL` straight from the environment when the client
 * is constructed, so attaching a database in the dashboard would otherwise
 * leave the app pointing at nothing. Resolving here — and assigning back to
 * `process.env` before anything constructs a client — makes "attach a
 * Postgres" the only step required.
 *
 * Imported for its side effect at the top of config/env.ts, which every
 * other module reaches through.
 */

/** Pooled connection, for the running app: many short-lived invocations. */
const RUNTIME_URL_KEYS = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"] as const;

/**
 * Unpooled connection, for migrations: pgbouncer in transaction mode cannot
 * run the advisory locks and DDL a migration needs, so a pooled URL can hang
 * or fail partway.
 */
const MIGRATION_URL_KEYS = [
  "DIRECT_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function firstConfigured(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return value;
  }
  return undefined;
}

/** The connection the running application should use, if any is configured. */
export function resolveDatabaseUrl(): string | undefined {
  return firstConfigured(RUNTIME_URL_KEYS);
}

/** The connection migrations should use — unpooled where one is offered. */
export function resolveMigrationDatabaseUrl(): string | undefined {
  return firstConfigured(MIGRATION_URL_KEYS) ?? resolveDatabaseUrl();
}

const resolved = resolveDatabaseUrl();
if (resolved && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolved;
}
