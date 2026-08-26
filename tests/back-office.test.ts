import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, createStudent, createUser, login, registerSchool } from "./helpers.js";

/**
 * Endpoints backing System B, the back-office web portal (Application Spec
 * sections 4 and 5). The access question these cover is which schools a
 * caller can see at all — a SUPER_USER's portal must stay inside its own
 * school even though it shares an endpoint with the district-wide view.
 */
describe("back-office school overview", () => {
  it("returns only the caller's own school for a SUPER_USER, with headline counts", async () => {
    const { school, token } = await registerSchool({ principalEmail: "bo-principal@test.example" });
    await createStudent(token, school.id, { name: "Ada Ncube" });
    await createUser(token, school.id, { role: "TEACHER", email: "bo-teacher@test.example" });

    const res = await request(app).get("/schools").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.schools).toHaveLength(1);
    expect(res.body.schools[0].id).toBe(school.id);
    // The principal plus the teacher just created.
    expect(res.body.schools[0].counts.users).toBe(2);
    expect(res.body.schools[0].counts.students).toBe(1);
  });

  it("does not leak another school into a SUPER_USER's overview", async () => {
    const first = await registerSchool({ principalEmail: "bo-first@test.example" });
    await registerSchool({ schoolName: "Other School", principalEmail: "bo-second@test.example" });

    const res = await request(app).get("/schools").set("Authorization", `Bearer ${first.token}`);

    expect(res.status).toBe(200);
    expect(res.body.schools.map((s: { id: string }) => s.id)).toEqual([first.school.id]);
  });

  it("reports per-school stats and blocks reading another school's", async () => {
    const first = await registerSchool({ principalEmail: "bo-stats-a@test.example" });
    const second = await registerSchool({ schoolName: "Second School", principalEmail: "bo-stats-b@test.example" });
    await createStudent(first.token, first.school.id, { name: "Ben Dlamini" });

    const own = await request(app)
      .get(`/schools/${first.school.id}/stats`)
      .set("Authorization", `Bearer ${first.token}`);
    expect(own.status).toBe(200);
    expect(own.body.stats.students).toBe(1);
    expect(own.body.stats.users).toBe(1);

    const other = await request(app)
      .get(`/schools/${second.school.id}/stats`)
      .set("Authorization", `Bearer ${first.token}`);
    expect(other.status).toBe(403);
  });

  it("lets only a SYSTEM_OWNER switch a school's demo mode", async () => {
    const { school, token } = await registerSchool({ principalEmail: "bo-demo@test.example" });

    // A SUPER_USER runs the school but cannot decide whose accounts become
    // one-click demo logins — that is a district call.
    const asPrincipal = await request(app)
      .patch(`/schools/${school.id}/demo-mode`)
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true });
    expect(asPrincipal.status).toBe(403);

    await createUser(token, school.id, { role: "SUPPORT", email: "bo-demo-support@test.example" });
    const support = await login("bo-demo-support@test.example", "Password123!");
    const asSupport = await request(app)
      .patch(`/schools/${school.id}/demo-mode`)
      .set("Authorization", `Bearer ${support.token}`)
      .send({ enabled: true });
    expect(asSupport.status).toBe(403);
  });

  it("keeps the back-office overview away from roles that belong to the mobile app", async () => {
    const { school, token } = await registerSchool({ principalEmail: "bo-roles@test.example" });

    for (const role of ["TEACHER", "SUPERVISOR", "PARENT"]) {
      await createUser(token, school.id, { role, email: `bo-${role.toLowerCase()}@test.example` });
      const staff = await login(`bo-${role.toLowerCase()}@test.example`, "Password123!");

      const res = await request(app).get("/schools").set("Authorization", `Bearer ${staff.token}`);
      expect(res.status, `${role} should not reach the back-office overview`).toBe(403);
    }
  });

  it("lets SUPPORT read the school profile and stats without granting user management", async () => {
    const { school, token } = await registerSchool({ principalEmail: "bo-support-admin@test.example" });
    await createUser(token, school.id, { role: "SUPPORT", email: "bo-support@test.example" });
    const support = await login("bo-support@test.example", "Password123!");

    const overview = await request(app).get("/schools").set("Authorization", `Bearer ${support.token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.schools).toHaveLength(1);

    const stats = await request(app)
      .get(`/schools/${school.id}/stats`)
      .set("Authorization", `Bearer ${support.token}`);
    expect(stats.status).toBe(200);

    // SUPPORT is deliberately outside schoolManagement, so creating staff
    // stays closed to it.
    const createAttempt = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${support.token}`)
      .send({ schoolId: school.id, role: "TEACHER", name: "Nope", email: "nope@test.example", temporaryPassword: "Password123!" });
    expect(createAttempt.status).toBe(403);
  });
});
