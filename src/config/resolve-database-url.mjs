/**
 * Vercel's Postgres/Neon integration does not set `DATABASE_URL`. It sets
 * `POSTGRES_PRISMA_URL` (pooled, already carrying the pgbouncer parameters
 * Prisma wants), `POSTGRES_URL`, and `POSTGRES_URL_NON_POOLING`. Newer Neon
 * integrations use `DATABASE_URL` / `DATABASE_URL_UNPOOLED` instead.
 *
 * Plain JavaScript on purpose. The deploy's postinstall hook runs this under
 * whatever `node` the platform provides, with no compile step and no loader
 * — importing TypeScript from there only works on versions new enough to
 * strip types, and fails the whole install on the ones that aren't.
 */

/** Pooled connection, for the running app: many short-lived invocations. */
export const RUNTIME_URL_KEYS = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];

/**
 * Unpooled connection, for migrations: pgbouncer in transaction mode cannot
 * run the advisory locks and DDL a migration needs, so a pooled URL can hang
 * or fail partway.
 */
export const MIGRATION_URL_KEYS = [
  "DIRECT_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

/**
 * @param {readonly string[]} keys
 * @returns {string | undefined}
 */
function firstConfigured(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return value;
  }
  return undefined;
}

/**
 * The connection the running application should use, if any is configured.
 * @returns {string | undefined}
 */
export function resolveDatabaseUrl() {
  return firstConfigured(RUNTIME_URL_KEYS);
}

/**
 * The connection migrations should use — unpooled where one is offered.
 * @returns {string | undefined}
 */
export function resolveMigrationDatabaseUrl() {
  return firstConfigured(MIGRATION_URL_KEYS) ?? resolveDatabaseUrl();
}
