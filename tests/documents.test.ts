import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerSchool } from "./helpers.js";

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
});
