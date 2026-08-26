/**
 * Applies pending migrations during a deploy's install step.
 *
 * @vercel/node compiles the serverless entrypoint but never runs a build
 * script, so postinstall is the only hook that fires with the project's
 * environment available. That makes this script responsible for being
 * careful about when it acts:
 *
 *   - No DATABASE_URL (a fresh clone, CI, or the very first deploy before a
 *     database is attached) — skip quietly. Failing here would block someone
 *     from ever getting far enough to attach one.
 *   - DATABASE_URL set but migrations fail — exit non-zero. A configured
 *     database that won't migrate is a broken deploy, and shipping it would
 *     only move the failure to the first request.
 */
import { spawnSync } from 'node:child_process'
import {
  MIGRATION_URL_KEYS,
  RUNTIME_URL_KEYS,
  resolveMigrationDatabaseUrl,
} from '../src/config/resolve-database-url.mjs'

const databaseUrl = resolveMigrationDatabaseUrl()

if (!databaseUrl) {
  // Skipping still lets a first deploy succeed before a database exists, but
  // a bare one-line skip reads like routine housekeeping in a green build
  // log — and the consequence only shows up later, as a 503 from a
  // deployment that otherwise looks fine. Name what was looked for and what
  // happens next, here, where someone is already reading.
  const names = [...new Set([...RUNTIME_URL_KEYS, ...MIGRATION_URL_KEYS])]
  console.log('[migrate] No database configured — skipping migrations.')
  console.log(`[migrate] Looked for: ${names.join(', ')}`)
  console.log('[migrate] ...and any prefixed form, e.g. myapp_DATABASE_URL.')
  console.log('[migrate] This deployment will build and serve, but every API')
  console.log('[migrate] request answers 503 until one of those is set on the')
  console.log('[migrate] project AND the deployment is rebuilt — variables only')
  console.log('[migrate] reach builds that start after they are added.')
  process.exit(0)
}

console.log('[migrate] Applying migrations…')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  // Prisma reads DATABASE_URL directly; point it at the unpooled connection,
  // since pgbouncer in transaction mode cannot hold the advisory locks a
  // migration takes.
  env: { ...process.env, DATABASE_URL: databaseUrl },
})

if (result.status !== 0) {
  console.error('[migrate] Migrations failed. Refusing to ship a deploy that cannot reach its schema.')
  process.exit(result.status ?? 1)
}
