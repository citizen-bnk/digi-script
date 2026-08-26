/**
 * Applies the database URL Vercel actually provides.
 *
 * Prisma reads `DATABASE_URL` straight from the environment when the client
 * is constructed, and Vercel's Postgres integration never sets that name —
 * so attaching a database in the dashboard would otherwise leave the app
 * pointing at nothing. Assigning it back here, before anything constructs a
 * client, makes "attach a Postgres" the only step required.
 *
 * The resolution itself lives in ./resolve-database-url.mjs, as plain
 * JavaScript, so the deploy's postinstall hook can import it under a bare
 * `node`. This module is the typed face of it, imported for its side effect
 * at the top of config/env.ts — which every other module reaches through.
 */
import {
  resolveDatabaseUrl,
  resolveMigrationDatabaseUrl,
} from "./resolve-database-url.mjs";

export { resolveDatabaseUrl, resolveMigrationDatabaseUrl };

const resolved = resolveDatabaseUrl();
if (resolved && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolved;
}
