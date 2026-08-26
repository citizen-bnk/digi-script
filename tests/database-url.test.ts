import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDatabaseUrl, resolveMigrationDatabaseUrl } from "../src/config/database-url.js";

/**
 * Vercel's Postgres integration never sets `DATABASE_URL` — it sets
 * `POSTGRES_PRISMA_URL` and friends. Attaching a database in the dashboard
 * therefore configured nothing this app read, and the only symptom was a
 * failed deployment with no obvious cause. These pin the resolution so that
 * stays fixed.
 */
const MANAGED_KEYS = [
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
