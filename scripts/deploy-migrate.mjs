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
import { resolveMigrationDatabaseUrl } from '../src/config/database-url.ts'

const databaseUrl = resolveMigrationDatabaseUrl()

if (!databaseUrl) {
  console.log('[migrate] No database configured — skipping migrations.')
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
