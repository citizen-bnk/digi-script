import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { DEMO_PASSWORD } from "../src/modules/demo/demo.personas.js";

/**
 * Demo mode is off in the test environment (DEMO_MODE is unset), so these
 * cover the gate itself. The one-click sign-in flow is exercised in a
 * browser against a seeded database rather than here, since it needs the
 * demo personas to actually exist.
 */
const app = createApp();

describe("demo mode gate", () => {
  it("hides the persona list unless demo mode is on", async () => {
    const res = await request(app).get("/demo/personas");
    expect(res.status).toBe(404);
  });

  it("refuses demo sign-in unless demo mode is on", async () => {
    const res = await request(app)
      .post("/demo/login")
      .send({ email: "nomsa.dlamini@gauteng-east.demo" });
    expect(res.status).toBe(404);
  });

  it("never puts the demo password in a response body", async () => {
    // Belt and braces: if the gate ever regressed, this asserts the thing
    // that actually matters — that the credential is not disclosed.
    for (const path of ["/demo/personas", "/demo/personas?app=mobile"]) {
      const res = await request(app).get(path);
      expect(JSON.stringify(res.body)).not.toContain(DEMO_PASSWORD);
    }
  });
});
