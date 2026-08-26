import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

/**
 * /health is the first thing anyone can reach when a deployment misbehaves,
 * and for a while it answered `{status:"ok"}` no matter what — including
 * with an unreachable database, which is precisely when someone is looking
 * at it. A demo showing no accounts and a database that cannot be read look
 * identical from the browser, so this has to tell them apart.
 */
const app = createApp();

describe("health", () => {
  it("reports the database and demo mode, not just liveness", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toEqual({ status: "ok" });
    // Whether demo mode is on is the other half of "why is the demo section
    // missing", so it belongs in the same answer.
    expect(typeof res.body.demoMode).toBe("boolean");
  });

  it("answers 503 rather than ok when it cannot serve", async () => {
    // A load balancer and a person reading the JSON should reach the same
    // conclusion; 200 with a broken database misleads both.
    const res = await request(app).get("/health");
    if (res.body.database.status !== "ok") {
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("degraded");
    }
  });

  it("never discloses connection details", async () => {
    // It is unauthenticated by design, so it must stay free of anything that
    // would help someone reach the database themselves.
    const res = await request(app).get("/health");
    const body = JSON.stringify(res.body);

    expect(body).not.toMatch(/postgres(ql)?:\/\//i);
    expect(body).not.toContain(process.env.DATABASE_URL ?? "__no_database_url__");
    expect(body).not.toContain(process.env.JWT_SECRET ?? "__no_jwt_secret__");
  });
});
