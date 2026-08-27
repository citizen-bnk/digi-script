import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app, createStudent, createUser, login, registerSchool } from "./helpers.js";
import { prisma } from "../src/db/prisma.js";

/**
 * Editing a record from the back-office detail screens.
 *
 * Until these endpoints existed the back office could only ever add: a
 * learner recorded in the wrong class, or a teacher who moved to a different
 * grade, was permanent. Every list in the portal now opens a detail screen,
 * and a detail screen that cannot save is a dead end.
 *
 * What is checked here is mostly *who* may save, and what the audit trail
 * says afterwards — the compliance record is the reason a school is allowed
 * to keep this data at all.
 */
describe("updating a student", () => {
  let schoolId: string;
  let principalToken: string;
  let studentId: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
    studentId = (await createStudent(principalToken, schoolId)).student.id;
  });

  function patch(token: string, body: Record<string, unknown>, id = studentId) {
    return request(app)
      .patch(`/students/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  it("saves the fields it was given and leaves the rest alone", async () => {
    const res = await patch(principalToken, { grade: "Grade 2", className: "Grade 2B" });

    expect(res.status).toBe(200);
    expect(res.body.student).toMatchObject({
      name: "Jane Smith",
      grade: "Grade 2",
      className: "Grade 2B",
    });
  });

  it("clears a field when sent null, which omitting it must not do", async () => {
    // "Leave alone" and "this was recorded wrongly, blank it" are different
    // intents, and a PATCH that cannot express the second one traps bad data.
    const cleared = await patch(principalToken, { className: null });
    expect(cleared.body.student.className).toBeNull();

    const untouched = await patch(principalToken, { grade: "Grade 3" });
    expect(untouched.body.student.className).toBeNull();
    expect(untouched.body.student.name).toBe("Jane Smith");
  });

  it("records the change in the audit trail without copying the values", async () => {
    await patch(principalToken, { medicalNotes: { allergy: "peanuts" }, grade: "Grade 2" });

    const audit = await request(app)
      .get(`/audit?schoolId=${schoolId}&action=STUDENT_UPDATED`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(audit.body.entries).toHaveLength(1);
    expect(audit.body.entries[0].targetId).toBe(studentId);
    expect(audit.body.entries[0].metadata).toEqual({ fields: ["grade", "medicalNotes"] });
    // Medical notes are exactly the data that should not be duplicated into a
    // second, differently-governed table.
    expect(JSON.stringify(audit.body.entries[0])).not.toContain("peanuts");
  });

  it("refuses a role that may read the roster but not change it", async () => {
    await createUser(principalToken, schoolId, {
      role: "TEACHER",
      email: "teacher.update@test.example",
      assignedClassName: "Grade 1A",
    });
    const teacher = await login("teacher.update@test.example", "Password123!");

    // The teacher can see this learner...
    const read = await request(app)
      .get(`/students/${studentId}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(read.status).toBe(200);

    // ...and still cannot edit them.
    expect((await patch(teacher.token, { grade: "Grade 9" })).status).toBe(403);
  });

  it("refuses another school's learner", async () => {
    const other = await registerSchool({ principalEmail: "other.principal@test.example" });

    const res = await patch(other.token, { grade: "Grade 2" });

    expect(res.status).toBe(403);
  });

  it("rejects an empty patch rather than writing a no-op audit entry", async () => {
    expect((await patch(principalToken, {})).status).toBe(400);
  });
});

describe("updating a user", () => {
  let schoolId: string;
  let principalToken: string;
  let principalId: string;
  let teacherId: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
    principalId = registered.user.id;
    teacherId = (
      await createUser(principalToken, schoolId, {
        role: "TEACHER",
        email: "teacher.record@test.example",
        assignedClassName: "Grade 1A",
      })
    ).user.id;
  });

  function patch(token: string, body: Record<string, unknown>, id = teacherId) {
    return request(app).patch(`/users/${id}`).set("Authorization", `Bearer ${token}`).send(body);
  }

  it("saves a name and a class reassignment", async () => {
    const res = await patch(principalToken, {
      schoolId,
      name: "Thandi Mokoena",
      assignedClassName: "Grade 2B",
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: "Thandi Mokoena",
      assignedClassName: "Grade 2B",
      role: "TEACHER",
    });
  });

  it("takes effect on what the account can reach", async () => {
    // A class reassignment that does not move the teacher's scope is a label
    // change, not a reassignment.
    await createStudent(principalToken, schoolId, { name: "Grade 2 Learner", className: "Grade 2B" });
    await patch(principalToken, { schoolId, assignedClassName: "Grade 2B" });

    const teacher = await login("teacher.record@test.example", "Password123!");
    const roster = await request(app)
      .get(`/students?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${teacher.token}`);

    expect(roster.body.students.map((s: { name: string }) => s.name)).toEqual(["Grade 2 Learner"]);
  });

  it("records the new role and status in the audit trail", async () => {
    await patch(principalToken, { schoolId, role: "SUPERVISOR", status: "INACTIVE" });

    const audit = await request(app)
      .get(`/audit?schoolId=${schoolId}&action=USER_UPDATED`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(audit.body.entries[0].metadata).toEqual({
      fields: ["role", "status"],
      role: "SUPERVISOR",
      status: "INACTIVE",
    });
  });

  it("will not let a caller change their own role or status", async () => {
    // Self-demotion locks the caller out mid-request; the recovery path is a
    // database edit.
    const demote = await patch(principalToken, { schoolId, role: "TEACHER" }, principalId);
    expect(demote.status).toBe(400);

    const deactivate = await patch(principalToken, { schoolId, status: "INACTIVE" }, principalId);
    expect(deactivate.status).toBe(400);

    // Their own name is still theirs to change.
    expect((await patch(principalToken, { schoolId, name: "New Name" }, principalId)).status).toBe(200);
  });

  it("will not grant SYSTEM_OWNER, which crosses schools", async () => {
    const res = await patch(principalToken, { schoolId, role: "SYSTEM_OWNER" });
    expect(res.status).toBe(400);
  });

  it("refuses a role that may not manage users at all", async () => {
    await createUser(principalToken, schoolId, {
      role: "SUPPORT",
      email: "support.record@test.example",
    });
    const support = await login("support.record@test.example", "Password123!");

    expect((await patch(support.token, { schoolId, name: "Renamed" })).status).toBe(403);
  });

  it("refuses another school's user", async () => {
    const other = await registerSchool({ principalEmail: "other.users@test.example" });

    const res = await patch(other.token, { schoolId: other.school.id, name: "Renamed" });

    // Scoped by the caller's own school, so the target is simply not there.
    expect(res.status).toBe(404);
  });

  it("reads one user back for the detail screen", async () => {
    const res = await request(app)
      .get(`/users/${teacherId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: teacherId,
      role: "TEACHER",
      assignedClassName: "Grade 1A",
    });
    // The detail screen has no use for a password hash, so it never leaves the API.
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

/**
 * Two gaps that only showed up once the back office linked its counters to
 * the lists behind them: a district director was shown an escalation count
 * and then refused the list, and an audit entry about a district colleague
 * opened a screen that reported the account did not exist.
 */
describe("what a district director can reach", () => {
  let districtId: string;
  let schoolId: string;
  let directorId: string;
  let directorToken: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;

    const district = await prisma.district.create({ data: { name: "Gauteng Test District" } });
    districtId = district.id;
    await prisma.school.update({ where: { id: schoolId }, data: { districtId } });

    const director = await prisma.user.create({
      data: {
        districtId,
        role: "SYSTEM_OWNER",
        name: "District Director",
        email: "director.reach@test.example",
        passwordHash: await bcrypt.hash("Password123!", 10),
      },
    });
    directorId = director.id;
    directorToken = (await login("director.reach@test.example", "Password123!")).token;
  });

  it("opens the escalation queue whose count the dashboard shows them", async () => {
    // The queue was restricted to the three school-level roles, so the
    // district dashboard reported open escalations and the sidebar offered
    // the screen, and the API answered 403.
    const res = await request(app)
      .get(`/escalations?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
  });

  it("reads a colleague who belongs to no single school", async () => {
    // District staff have schoolId null, so a lookup keyed on schoolId alone
    // reports them missing — which is what an audit row about them opened.
    const res = await request(app)
      .get(`/users/${directorId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${directorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("District Director");
  });

  it("reads a school user through the district, and still not one outside it", async () => {
    const staff = await createUser(directorToken, schoolId, {
      role: "TEACHER",
      email: "district.teacher@test.example",
    });
    const inside = await request(app)
      .get(`/users/${staff.user.id}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${directorToken}`);
    expect(inside.status).toBe(200);

    // A school registered on its own belongs to no district, so it is not
    // this director's to read — a widened lookup must not become a global one.
    const other = await registerSchool({ principalEmail: "outside.district@test.example" });
    const outside = await request(app)
      .get(`/users/${other.user.id}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${directorToken}`);
    expect(outside.status).toBe(404);
  });
});
