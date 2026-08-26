import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

/**
 * A variable created in a hosting dashboard and left blank arrives as an
 * empty string, not as absent. Zod's `.default()` only fires on undefined,
 * so the empty value passed straight through — JWT_EXPIRES_IN reached
 * jsonwebtoken as "" and threw on the first sign-in of a deployment that
 * was otherwise working, as an unhandled 500 nowhere near the setting.
 */
const SAVED = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...SAVED };
});

async function loadEnv() {
  const { env } = await import("../src/config/env.js");
  return env;
}

describe("blank environment variables", () => {
  it("falls back to the default when a value is left empty", async () => {
    process.env.JWT_EXPIRES_IN = "";
    expect((await loadEnv()).JWT_EXPIRES_IN).toBe("12h");
  });

  it("treats whitespace as empty too", async () => {
    process.env.JWT_EXPIRES_IN = "   ";
    expect((await loadEnv()).JWT_EXPIRES_IN).toBe("12h");
  });

  it("trims a value pasted with surrounding whitespace", async () => {
    process.env.JWT_EXPIRES_IN = "  8h  ";
    expect((await loadEnv()).JWT_EXPIRES_IN).toBe("8h");
  });

  it("keeps a real value", async () => {
    process.env.JWT_EXPIRES_IN = "7d";
    expect((await loadEnv()).JWT_EXPIRES_IN).toBe("7d");
  });

  it("applies the same rule to other defaulted variables", async () => {
    process.env.DEMO_MODE = "";
    expect((await loadEnv()).DEMO_MODE).toBe(true);
  });

  it("rejects a timespan jsonwebtoken would not accept, at startup", async () => {
    // The point is where this fails: as a named configuration error the 503
    // can report, not as a 500 the first time somebody signs in.
    process.env.JWT_EXPIRES_IN = "forever";
    await expect(loadEnv()).rejects.toThrow(/JWT_EXPIRES_IN|Invalid environment/i);
  });
});

describe("every accepted timespan really is accepted by jsonwebtoken", () => {
  // The validation is a regex standing in for the `ms` parser. If the two
  // ever disagree, the failure returns to being a 500 at sign-in.
  it.each(["12h", "43200", "7d", "30m", "1.5h", "2 days", "60"])("%s", async (value) => {
    process.env.JWT_EXPIRES_IN = value;
    const env = await loadEnv();
    expect(() =>
      jwt.sign({ sub: "x" }, "a-secret-that-is-long-enough", {
        expiresIn: env.JWT_EXPIRES_IN,
      } as jwt.SignOptions),
    ).not.toThrow();
  });
});
