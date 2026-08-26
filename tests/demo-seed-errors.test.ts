import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { redactConnectionStrings } from "../src/utils/redact.js";

/**
 * "Internal server error" is what a failing seed said on a hosted
 * deployment. The reason went to a function log nobody watching the screen
 * could reach, so a demo that would not load offered nothing to act on.
 *
 * The seed route answers with the reason instead — which means the reason
 * must never carry the database password, and Prisma puts the datasource URL
 * into several of its messages verbatim.
 */
const source = readFileSync(new URL("../src/modules/demo/demo.routes.ts", import.meta.url), "utf8");


describe("demo seed failures", () => {
  it("returns the reason rather than a bare 500", () => {
    expect(source).toContain('"Loading the demo data failed part-way through."');
    expect(source).toContain("reason:");
  });

  it("gives every endpoint the same treatment, not just the seed", () => {
    // Covering one route left the next failure — a demo sign-in — reporting
    // "Internal server error" with nothing to act on.
    const handler = readFileSync(
      new URL("../src/middleware/error-handler.ts", import.meta.url),
      "utf8",
    );
    expect(handler).toContain("redactConnectionStrings");
    expect(handler).toContain("env.DEMO_MODE");
  });

  it("says nothing beyond the generic message when demo mode is off", () => {
    // A deployment holding real records keeps detail in the log.
    const handler = readFileSync(
      new URL("../src/middleware/error-handler.ts", import.meta.url),
      "utf8",
    );
    expect(handler).toMatch(/env\.DEMO_MODE\s*\n?\s*\?/);
  });

  it("strips the password out of a Prisma connection error", () => {
    const message =
      "Can't reach database server at postgresql://neondb_owner:npg_SECRET123@ep-x-pooler.neon.tech/neondb?sslmode=require";
    const safe = redactConnectionStrings(message);

    expect(safe).not.toContain("npg_SECRET123");
    expect(safe).not.toContain("neondb_owner");
    expect(safe).toContain("[connection string removed]");
  });

  it("strips every scheme Prisma might print", () => {
    for (const url of [
      "postgres://user:pw@host/db",
      "postgresql://user:pw@host/db",
      "prisma://accelerate.host/x?api_key=pw",
    ]) {
      expect(redactConnectionStrings(`failed at ${url} while connecting`)).not.toContain("pw");
    }
  });

  it("keeps the useful part of the message", () => {
    const safe = redactConnectionStrings(
      "The table `public.schools` does not exist in the current database.",
    );
    expect(safe).toContain("does not exist in the current database");
  });

  it("bounds the length so a huge Prisma dump cannot fill the response", () => {
    expect(redactConnectionStrings("x".repeat(5000)).length).toBeLessThanOrEqual(600);
  });
});
