import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createStudent, createUser, linkParent, login, registerSchool } from "./helpers.js";

describe("student records and RBAC scoping", () => {
  let schoolId: string;
  let principalToken: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
  });

  it("lets a SUPER_USER create and list students in their school", async () => {
    await createStudent(principalToken, schoolId, { name: "Jane Smith", className: "Grade 1A" });
    await createStudent(principalToken, schoolId, { name: "John Doe", className: "Grade 2B" });

    const res = await request(app)
      .get(`/students?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(2);
  });

  it("scopes a TEACHER's roster to their assigned class only", async () => {
    await createStudent(principalToken, schoolId, { name: "Jane Smith", className: "Grade 1A" });
    await createStudent(principalToken, schoolId, { name: "John Doe", className: "Grade 2B" });

    await createUser(principalToken, schoolId, {
      role: "TEACHER",
      email: "teacher@test.example",
      assignedClassName: "Grade 1A",
    });
    const teacher = await login("teacher@test.example", "Password123!");

    const res = await request(app)
      .get(`/students?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${teacher.token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].className).toBe("Grade 1A");
  });

  it("lets a parent see only their linked children via /students/my-children", async () => {
    const jane = await createStudent(principalToken, schoolId, { name: "Jane Smith" });
    await createStudent(principalToken, schoolId, { name: "Unrelated Kid" });

    await createUser(principalToken, schoolId, { role: "PARENT", email: "parent@test.example" });
    const parentUser = await request(app)
      .get(`/users?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    const parentId = parentUser.body.users.find((u: { email: string }) => u.email === "parent@test.example").id;

    await linkParent(principalToken, schoolId, jane.student.id, parentId);
    const parent = await login("parent@test.example", "Password123!");

    const res = await request(app)
      .get("/students/my-children")
      .set("Authorization", `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0].name).toBe("Jane Smith");
  });

  it("blocks a parent from viewing a student they are not linked to", async () => {
    const jane = await createStudent(principalToken, schoolId, { name: "Jane Smith" });
    await createUser(principalToken, schoolId, { role: "PARENT", email: "parent@test.example" });
    const parent = await login("parent@test.example", "Password123!");

    const res = await request(app)
      .get(`/students/${jane.student.id}`)
      .set("Authorization", `Bearer ${parent.token}`);

    expect(res.status).toBe(403);
  });

  it("allows a linked parent to view their own child by id", async () => {
    const jane = await createStudent(principalToken, schoolId, { name: "Jane Smith" });
    await createUser(principalToken, schoolId, { role: "PARENT", email: "parent@test.example" });
    const parentUser = await request(app)
      .get(`/users?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    const parentId = parentUser.body.users.find((u: { email: string }) => u.email === "parent@test.example").id;
    await linkParent(principalToken, schoolId, jane.student.id, parentId);
    const parent = await login("parent@test.example", "Password123!");

    const res = await request(app)
      .get(`/students/${jane.student.id}`)
      .set("Authorization", `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.student.id).toBe(jane.student.id);
  });
});
