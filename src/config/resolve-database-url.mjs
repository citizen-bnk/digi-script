/**
 * Finds the Postgres connection a hosting platform has provided, under
 * whatever name it chose to provide it.
 *
 * Vercel's Postgres/Neon integration does not set `DATABASE_URL`. It sets
 * `POSTGRES_PRISMA_URL` (pooled, already carrying the pgbouncer parameters
 * Prisma wants), `POSTGRES_URL`, and `POSTGRES_URL_NON_POOLING`. Newer Neon
 * integrations use `DATABASE_URL` / `DATABASE_URL_UNPOOLED`. And when a
 * project attaches more than one store, the integration prefixes every name
 * it writes — `digi_DATABASE_URL`, `digi_DATABASE_URL_UNPOOLED` — so a
 * database can be correctly attached and still be invisible to anything
 * looking only for the bare names.
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
 * Prisma's shadow database is a throwaway it creates and drops while
 * diffing migrations. It ends in `_DATABASE_URL`, so a suffix match would
 * otherwise adopt it as the application's database.
 */
const NEVER_USE = new Set(["SHADOW_DATABASE_URL"]);

/** @param {string | undefined} value */
function isConfigured(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Names carrying `key`, exact match first, then any prefixed form. Prefixed
 * names are sorted so a project with several attached stores resolves to the
 * same one on every invocation rather than by environment ordering.
 *
 * @param {string} key
 * @returns {string[]}
 */
function candidateNames(key) {
  const prefixed = Object.keys(process.env)
    .filter((name) => name !== key && name.endsWith(`_${key}`) && !NEVER_USE.has(name))
    .sort();
  return [key, ...prefixed];
}

/**
 * @param {readonly string[]} keys
 * @returns {string | undefined}
 */
function firstConfigured(keys) {
  // Exhaust every name for one key before moving on: an exact
  // POSTGRES_PRISMA_URL should still lose to a prefixed DATABASE_URL only if
  // DATABASE_URL is the more specific intent — which the key order encodes.
  for (const key of keys) {
    for (const name of candidateNames(key)) {
      if (isConfigured(process.env[name])) return process.env[name];
    }
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

/**
 * Every database-ish name actually present, for diagnostics. Values are
 * never included — these are connection strings with credentials in them.
 * @returns {string[]}
 */
export function configuredDatabaseUrlNames() {
  const all = [...RUNTIME_URL_KEYS, ...MIGRATION_URL_KEYS];
  return all
    .flatMap((key) => candidateNames(key))
    .filter((name) => isConfigured(process.env[name]))
    .filter((name, index, names) => names.indexOf(name) === index);
}
