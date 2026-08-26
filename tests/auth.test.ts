import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, login, registerSchool } from "./helpers.js";

describe("school registration & auth", () => {
  it("registers a school and its principal as SUPER_USER", async () => {
    const res = await request(app).post("/schools/register").send({
      schoolName: "Riverside Primary",
      principalName: "Jennifer Johnson",
      principalEmail: "principal@riverside.test",
      principalPassword: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.school.name).toBe("Riverside Primary");
    expect(res.body.user.role).toBe("SUPER_USER");
    expect(typeof res.body.token).toBe("string");
  });

  it("rejects duplicate registration emails", async () => {
    await registerSchool({ principalEmail: "dupe@test.example" });
    const res = await request(app).post("/schools/register").send({
      schoolName: "Another School",
      principalName: "Someone Else",
      principalEmail: "dupe@test.example",
      principalPassword: "Password123!",
    });
    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    await registerSchool();

    const good = await login("principal@test.example", "Password123!");
    expect(good.token).toBeTruthy();

    const bad = await request(app)
      .post("/auth/login")
      .send({ email: "principal@test.example", password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("returns the authenticated user's profile from /auth/me", async () => {
    const { token } = await registerSchool();
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("principal@test.example");
  });

  it("rejects requests without a bearer token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
