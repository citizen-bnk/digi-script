import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createStudent, createUser, login, registerSchool } from "./helpers.js";

describe("document ingestion, RBAC, escalation, and audit", () => {
  let schoolId: string;
  let principalToken: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
  });

  it("auto-categorizes a high-confidence upload and skips the escalation queue", async () => {
    const res = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .field("academicYear", "2026")
      .field("term", "Term 3")
      .attach("file", Buffer.from("attendance data"), "Attendance_Grade1A.pdf");

    expect(res.status).toBe(201);
    expect(res.body.document.status).toBe("CATEGORIZED");
    expect(res.body.document.folderPath).toBe("2026/Term 3/Attendance Register");

    const escalations = await request(app)
      .get(`/escalations?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    expect(escalations.body.escalations).toHaveLength(0);
  });

  it("routes a low-confidence upload to the escalation queue", async () => {
    const res = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("nothing recognizable here"), "mystery_scan_001.pdf");

    expect(res.status).toBe(201);
    expect(res.body.document.status).toBe("ESCALATED");

    const escalations = await request(app)
      .get(`/escalations?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    expect(escalations.body.escalations).toHaveLength(1);
    expect(escalations.body.escalations[0].documentId).toBe(res.body.document.id);
    expect(escalations.body.escalations[0].reasonType).toBe("LOW_CONFIDENCE_CATEGORIZATION");
  });

  it("auto-resolves a document's escalation when its category is confirmed", async () => {
    const upload = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("nothing recognizable here"), "mystery_scan_002.pdf");
    const documentId = upload.body.document.id;

    const confirmed = await request(app)
      .post(`/documents/${documentId}/confirm-category`)
      .set("Authorization", `Bearer ${principalToken}`)
      .send({ schoolId, category: "Health Record" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.document.status).toBe("CATEGORIZED");

    const escalations = await request(app)
      .get(`/escalations?schoolId=${schoolId}&status=RESOLVED`)
      .set("Authorization", `Bearer ${principalToken}`);
    expect(escalations.body.escalations).toHaveLength(1);
    expect(escalations.body.escalations[0].documentId).toBe(documentId);
  });

  it("lets a supervisor resolve an escalation", async () => {
    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("unrecognizable content"), "blob.pdf");

    const list = await request(app)
      .get(`/escalations?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    const escalationId = list.body.escalations[0].id;

    const resolved = await request(app)
      .post(`/escalations/${escalationId}/resolve`)
      .set("Authorization", `Bearer ${principalToken}`)
      .send({ schoolId, resolutionNotes: "Manually confirmed as a maintenance invoice." });

    expect(resolved.status).toBe(200);
    expect(resolved.body.escalation.status).toBe("RESOLVED");
    expect(resolved.body.escalation.resolutionNotes).toContain("maintenance invoice");
  });

  it("blocks a PARENT role from listing school documents", async () => {
    await request(app).post("/users").set("Authorization", `Bearer ${principalToken}`).send({
      schoolId,
      name: "Sarah Smith",
      email: "parent@test.example",
      role: "PARENT",
      temporaryPassword: "Password123!",
    });

    const parentLogin = await request(app)
      .post("/auth/login")
      .send({ email: "parent@test.example", password: "Password123!" });

    const res = await request(app)
      .get(`/documents?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${parentLogin.body.token}`);

    expect(res.status).toBe(403);
  });

  it("blocks cross-school access even for a valid SUPER_USER token", async () => {
    const other = await registerSchool({ principalEmail: "other-principal@test.example" });

    const res = await request(app)
      .get(`/documents?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });

  it("records an immutable audit trail entry for every upload", async () => {
    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("report card term 2"), "ReportCard.pdf");

    const audit = await request(app)
      .get(`/audit?schoolId=${schoolId}&action=DOCUMENT_UPLOADED`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(audit.status).toBe(200);
    expect(audit.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(audit.body.entries[0].action).toBe("DOCUMENT_UPLOADED");
  });

  it("scopes a TEACHER's document access to their class and school-wide docs, and blocks uploads", async () => {
    const inClass = await createStudent(principalToken, schoolId, { name: "Jane Smith", className: "Grade 1A" });
    const otherClass = await createStudent(principalToken, schoolId, { name: "John Doe", className: "Grade 2B" });

    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .field("studentId", inClass.student.id)
      .attach("file", Buffer.from("attendance data"), "Attendance_InClass.pdf");
    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .field("studentId", otherClass.student.id)
      .attach("file", Buffer.from("attendance data"), "Attendance_OtherClass.pdf");
    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("school announcement"), "Announcement.pdf");

    await createUser(principalToken, schoolId, {
      role: "TEACHER",
      email: "teacher@test.example",
      assignedClassName: "Grade 1A",
    });
    const teacher = await login("teacher@test.example", "Password123!");

    const list = await request(app)
      .get(`/documents?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(list.status).toBe(200);
    const filenames = list.body.documents.map((d: { originalFilename: string }) => d.originalFilename).sort();
    expect(filenames).toEqual(["Announcement.pdf", "Attendance_InClass.pdf"]);

    const otherDocRes = await request(app)
      .get(`/documents?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    const otherClassDocId = otherDocRes.body.documents.find(
      (d: { originalFilename: string }) => d.originalFilename === "Attendance_OtherClass.pdf",
    ).id;

    const denied = await request(app)
      .get(`/documents/${otherClassDocId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(denied.status).toBe(403);

    const uploadAttempt = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${teacher.token}`)
      .field("schoolId", schoolId)
      .attach("file", Buffer.from("trying to upload"), "NotAllowed.pdf");
    expect(uploadAttempt.status).toBe(403);
  });
});
