import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  configuredDatabaseUrlNames,
  resolveDatabaseUrl,
  resolveMigrationDatabaseUrl,
} from "../src/config/resolve-database-url.mjs";

/**
 * Vercel's Postgres integration never sets `DATABASE_URL` — it sets
 * `POSTGRES_PRISMA_URL` and friends. Attaching a database in the dashboard
 * therefore configured nothing this app read, and the only symptom was a
 * failed deployment with no obvious cause. These pin the resolution so that
 * stays fixed.
 */
const MANAGED_KEYS = [
  "digi_DATABASE_URL",
  "digi_DATABASE_URL_UNPOOLED",
  "acme_POSTGRES_PRISMA_URL",
  "SHADOW_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DIRECT_DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(MANAGED_KEYS.map((key) => [key, process.env[key]]));
  for (const key of MANAGED_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("database url resolution", () => {
  it("prefers an explicit DATABASE_URL over anything the platform injected", () => {
    process.env.DATABASE_URL = "postgresql://explicit";
    process.env.POSTGRES_PRISMA_URL = "postgresql://platform";
    expect(resolveDatabaseUrl()).toBe("postgresql://explicit");
  });

  it("falls back to Vercel's pooled Prisma URL", () => {
    process.env.POSTGRES_PRISMA_URL = "postgresql://pooled?pgbouncer=true";
    expect(resolveDatabaseUrl()).toBe("postgresql://pooled?pgbouncer=true");
  });

  it("falls back again to POSTGRES_URL", () => {
    process.env.POSTGRES_URL = "postgresql://plain";
    expect(resolveDatabaseUrl()).toBe("postgresql://plain");
  });

  it("reports nothing when no database is configured at all", () => {
    expect(resolveDatabaseUrl()).toBeUndefined();
    expect(resolveMigrationDatabaseUrl()).toBeUndefined();
  });

  it("ignores an empty value rather than treating it as configured", () => {
    process.env.DATABASE_URL = "";
    process.env.POSTGRES_PRISMA_URL = "postgresql://real";
    expect(resolveDatabaseUrl()).toBe("postgresql://real");
  });

  describe("migrations", () => {
    it("prefer an unpooled connection, since pgbouncer cannot hold migration locks", () => {
      process.env.POSTGRES_PRISMA_URL = "postgresql://pooled";
      process.env.POSTGRES_URL_NON_POOLING = "postgresql://direct";
      expect(resolveMigrationDatabaseUrl()).toBe("postgresql://direct");
    });

    it("fall back to the pooled connection when that is all there is", () => {
      process.env.POSTGRES_PRISMA_URL = "postgresql://pooled";
      expect(resolveMigrationDatabaseUrl()).toBe("postgresql://pooled");
    });
  });
});

/**
 * The deploy's postinstall hook runs the migration script under whatever
 * `node` the platform provides — no compile step, no loader. Importing
 * TypeScript from there only works on versions new enough to strip types,
 * and fails the entire install on the ones that are not. Running with
 * stripping switched off stands in for that older Node.
 */
describe("the migration script under a bare node", () => {
  it("runs without TypeScript type stripping", () => {
    const output = execFileSync(
      process.execPath,
      ["--no-experimental-strip-types", "scripts/deploy-migrate.mjs"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) => !MANAGED_KEYS.includes(key)),
        ) as NodeJS.ProcessEnv,
      },
    );

    expect(output).toContain("No database configured");
  });
});

/**
 * A Vercel storage integration prefixes every variable it writes when the
 * project asks it to — `digi_DATABASE_URL`, `digi_DATABASE_URL_UNPOOLED`.
 * The database is then correctly attached and completely invisible to code
 * looking only for bare names: the build logs "No database configured" and
 * the deployment answers 503, with nothing in the dashboard looking wrong.
 */
describe("integration-prefixed names", () => {
  it("finds a prefixed connection when no bare one exists", () => {
    process.env.digi_DATABASE_URL = "postgresql://prefixed";
    expect(resolveDatabaseUrl()).toBe("postgresql://prefixed");
  });

  it("gives migrations the prefixed unpooled connection", () => {
    process.env.digi_DATABASE_URL = "postgresql://prefixed-pooled";
    process.env.digi_DATABASE_URL_UNPOOLED = "postgresql://prefixed-direct";
    expect(resolveMigrationDatabaseUrl()).toBe("postgresql://prefixed-direct");
  });

  it("does not mistake the pooled name for the unpooled one", () => {
    // digi_DATABASE_URL_UNPOOLED must not satisfy a search for _DATABASE_URL,
    // or the app would run against the direct connection and migrations
    // against nothing in particular.
    process.env.digi_DATABASE_URL_UNPOOLED = "postgresql://direct-only";
    expect(resolveDatabaseUrl()).toBeUndefined();
    expect(resolveMigrationDatabaseUrl()).toBe("postgresql://direct-only");
  });

  it("prefers an explicit bare name over a prefixed one", () => {
    // Someone who sets DATABASE_URL by hand means it, whatever an
    // integration also wrote.
    process.env.DATABASE_URL = "postgresql://chosen";
    process.env.digi_DATABASE_URL = "postgresql://integration";
    expect(resolveDatabaseUrl()).toBe("postgresql://chosen");
  });

  it("never adopts Prisma's shadow database", () => {
    // SHADOW_DATABASE_URL ends in _DATABASE_URL but names a throwaway that
    // Prisma creates and drops; running the app against it would lose data.
    process.env.SHADOW_DATABASE_URL = "postgresql://shadow";
    expect(resolveDatabaseUrl()).toBeUndefined();
    expect(configuredDatabaseUrlNames()).not.toContain("SHADOW_DATABASE_URL");
  });

  it("resolves the same store on every call when several are attached", () => {
    process.env.acme_POSTGRES_PRISMA_URL = "postgresql://acme";
    process.env.digi_DATABASE_URL = "postgresql://digi";
    // DATABASE_URL outranks POSTGRES_PRISMA_URL by key order, prefixed or not.
    expect(resolveDatabaseUrl()).toBe("postgresql://digi");
    expect(resolveDatabaseUrl()).toBe("postgresql://digi");
  });

  it("lists the names it found, and never their values", () => {
    process.env.digi_DATABASE_URL = "postgresql://user:secret@host/db";
    const names = configuredDatabaseUrlNames();
    expect(names).toContain("digi_DATABASE_URL");
    expect(names.join(" ")).not.toContain("secret");
  });
});
