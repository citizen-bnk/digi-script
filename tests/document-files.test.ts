import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createUser, login, registerSchool } from "./helpers.js";
import { pdfBytes, pngBytes } from "../src/modules/demo/demo.files.js";

/**
 * The capture-to-viewer path, end to end.
 *
 * Until this existed the pipeline stopped at "stored": a document could be
 * uploaded, categorized and filed, and then never opened again. There was no
 * endpoint that returned the bytes, and the bytes themselves went to local
 * disk — which on the serverless deployment is /tmp, wiped between cold
 * starts. A document was readable for a few minutes and then gone.
 */
describe("uploading a file and reading it back", () => {
  let schoolId: string;
  let principalToken: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
  });

  async function upload(filename: string, bytes: Buffer, mimeType: string) {
    return request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .field("academicYear", "2026")
      .field("term", "Term 3")
      .attach("file", bytes, { filename, contentType: mimeType });
  }

  it("returns a PDF byte-for-byte as it was uploaded", async () => {
    const bytes = pdfBytes("Attendance Register - Grade 4A", ["Present and absent recorded daily."]);
    const created = await upload("Grade4A_Attendance_August.pdf", bytes, "application/pdf");
    expect(created.status).toBe(201);

    const fetched = await request(app)
      .get(`/documents/${created.body.document.id}/file?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(fetched.status).toBe(200);
    expect(fetched.headers["content-type"]).toContain("application/pdf");
    // A viewer needs to render it in place, and a download needs the name.
    expect(fetched.headers["content-disposition"]).toContain("Grade4A_Attendance_August.pdf");
    expect(Buffer.compare(fetched.body as Buffer, bytes)).toBe(0);
  });

  it("keeps an image an image", async () => {
    const bytes = pngBytes(80, 100);
    const created = await upload("Learner_ID_Capture.png", bytes, "image/png");
    expect(created.status).toBe(201);

    const fetched = await request(app)
      .get(`/documents/${created.body.document.id}/file?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);

    expect(fetched.status).toBe(200);
    expect(fetched.headers["content-type"]).toContain("image/png");
  });

  it("still categorizes and files what it stored", async () => {
    // Storing the bytes must not cost the pipeline that runs over them.
    const created = await upload(
      "Grade4A_Attendance_August.pdf",
      Buffer.from("attendance register present absent"),
      "application/pdf",
    );

    expect(created.body.document.category?.name).toBe("Attendance Register");
    expect(created.body.document.folderPath).toBe("2026/Term 3/Attendance Register");
    expect(created.body.document.sizeBytes).toBeGreaterThan(0);
  });

  describe("who may read the bytes", () => {
    it("refuses without a token, and with a bad one", async () => {
      const created = await upload("Note.pdf", pdfBytes("Note", ["x"]), "application/pdf");
      const path = `/documents/${created.body.document.id}/file?schoolId=${schoolId}`;

      expect((await request(app).get(path)).status).toBe(401);
      expect(
        (await request(app).get(path).set("Authorization", "Bearer not.a.real.token")).status,
      ).toBe(401);
    });

    it("refuses a role that may not read the document itself", async () => {
      // The bytes must be scoped exactly like the metadata — otherwise a
      // reader blocked from a document reads it by asking for a different URL.
      const created = await upload("Note.pdf", pdfBytes("Note", ["x"]), "application/pdf");

      await createUser(principalToken, schoolId, {
        role: "PARENT",
        email: "parent.files@test.example",
      });
      const parent = await login("parent.files@test.example", "Password123!");

      const res = await request(app)
        .get(`/documents/${created.body.document.id}/file?schoolId=${schoolId}`)
        .set("Authorization", `Bearer ${parent.token}`);

      expect(res.status).toBe(403);
    });

    it("refuses another school's document", async () => {
      const created = await upload("Note.pdf", pdfBytes("Note", ["x"]), "application/pdf");
      const other = await registerSchool({ principalEmail: "other.school@test.example" });

      const res = await request(app)
        .get(`/documents/${created.body.document.id}/file?schoolId=${other.school.id}`)
        .set("Authorization", `Bearer ${other.token}`);

      expect(res.status).toBe(404);
    });
  });

  it("refuses a file larger than the platform would accept", async () => {
    // A serverless request body caps around 4.5 MB. Over that the platform
    // rejects it first, with a page that says nothing about file size.
    const res = await upload("Huge.pdf", Buffer.alloc(5 * 1024 * 1024, 1), "application/pdf");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/upload limit/i);
  });
});

describe("the generated demo files", () => {
  it("are genuinely valid, not text with a pdf extension", () => {
    const pdf = pdfBytes("Report Card", ["Palesa Ndlovu", "Grade 4A"]);
    // Header, a cross-reference table and a trailer are what make it openable.
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("startxref");
    expect(pdf.subarray(-6).toString()).toContain("%%EOF");
    expect(pdf.toString("latin1")).toContain("Palesa Ndlovu");

    const png = pngBytes(16, 16);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.subarray(12, 16).toString()).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(16);
    expect(png.subarray(-8, -4).toString()).toBe("IEND");
  });
});
