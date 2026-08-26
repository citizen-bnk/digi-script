import { describe, expect, it } from "vitest";
import request from "supertest";
import serverlessApp from "../api/index.js";

/**
 * The Vercel entrypoint mounts the same Express app under /api, so both
 * frontends can talk to their own origin. If that mount ever slipped, every
 * deployed request would 404 while local development kept working — so it is
 * worth pinning here rather than discovering it after a deploy.
 */
describe("serverless entrypoint", () => {
  it("serves the API under /api", async () => {
    const res = await request(serverlessApp).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("digiscript-core");
  });

  it("does not serve the API at the root, which belongs to the mobile app", async () => {
    const res = await request(serverlessApp).get("/health");
    expect(res.status).toBe(404);
  });

  it("routes a real endpoint through the mount, not just the health check", async () => {
    // Demo mode is off in tests, so this proves the router is reachable and
    // its own gate is what answers — rather than the mount swallowing it.
    const res = await request(serverlessApp).get("/api/demo/personas");
    expect(res.status).toBe(404);

    const login = await request(serverlessApp).post("/api/auth/login").send({});
    expect(login.status).toBe(400);
  });
});
