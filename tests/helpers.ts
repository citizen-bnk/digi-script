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

export async function createUser(
  token: string,
  schoolId: string,
  overrides: Partial<Record<string, string>> & { role: string; email: string },
) {
  const res = await request(app)
    .post("/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      schoolId,
      name: "Test User",
      temporaryPassword: "Password123!",
      ...overrides,
    });
  return res.body as { user: { id: string; email: string; role: string } };
}

export async function createStudent(
  token: string,
  schoolId: string,
  overrides: Partial<Record<string, string>> = {},
) {
  const res = await request(app)
    .post("/students")
    .set("Authorization", `Bearer ${token}`)
    .send({ schoolId, name: "Jane Smith", grade: "Grade 1", className: "Grade 1A", ...overrides });
  return res.body as { student: { id: string } };
}

export async function linkParent(token: string, schoolId: string, studentId: string, parentUserId: string) {
  const res = await request(app)
    .post(`/students/${studentId}/parents`)
    .set("Authorization", `Bearer ${token}`)
    .send({ schoolId, parentUserId });
  return res.body as { link: { id: string } };
}
