import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function registerSchool(overrides: Partial<Record<string, string>> = {}) {
  const res = await request(app)
    .post("/schools/register")
    .send({
      schoolName: "Test Primary School",
      principalName: "Test Principal",
      principalEmail: "principal@test.example",
      principalPassword: "Password123!",
      ...overrides,
    });
  return res.body as { school: { id: string }; user: { id: string }; token: string };
}

export async function login(email: string, password: string) {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body as { user: { id: string }; token: string };
}
