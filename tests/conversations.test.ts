import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createStudent, createUser, linkParent, login, registerSchool } from "./helpers.js";

async function setupParentWithStudent(principalToken: string, schoolId: string, parentEmail = "parent@test.example") {
  const student = await createStudent(principalToken, schoolId, { name: "Jane Smith" });
  await createUser(principalToken, schoolId, { role: "PARENT", email: parentEmail });
  const usersRes = await request(app)
    .get(`/users?schoolId=${schoolId}`)
    .set("Authorization", `Bearer ${principalToken}`);
  const parentId = usersRes.body.users.find((u: { email: string }) => u.email === parentEmail).id;
  await linkParent(principalToken, schoolId, student.student.id, parentId);
  const parent = await login(parentEmail, "Password123!");
  return { studentId: student.student.id as string, parentToken: parent.token as string };
}

describe("conversations, AI response, and escalation handoff", () => {
  let schoolId: string;
  let principalToken: string;

  beforeEach(async () => {
    const registered = await registerSchool();
    schoolId = registered.school.id;
    principalToken = registered.token;
  });

  it("returns the same open conversation on repeated start calls", async () => {
    const { studentId, parentToken } = await setupParentWithStudent(principalToken, schoolId);

    const first = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });
    const second = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.conversation.id).toBe(first.body.conversation.id);
  });

  it("keeps a general enquiry separate from a thread about a specific child", async () => {
    const { studentId, parentToken } = await setupParentWithStudent(principalToken, schoolId);

    const aboutChild = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });

    // No studentId: a general question, which must open its own thread
    // rather than being folded into the one above.
    const general = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId });

    expect(general.status).toBe(201);
    expect(general.body.conversation.id).not.toBe(aboutChild.body.conversation.id);
    expect(general.body.conversation.studentId).toBeNull();

    // And a repeat general enquiry still reuses the general thread.
    const generalAgain = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId });
    expect(generalAgain.body.conversation.id).toBe(general.body.conversation.id);
  });

  it("answers a well-matched question from categorized documents without escalating", async () => {
    const { studentId, parentToken } = await setupParentWithStudent(principalToken, schoolId);

    await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${principalToken}`)
      .field("schoolId", schoolId)
      .field("studentId", studentId)
      .attach("file", Buffer.from("attendance data"), "Attendance_Grade1A.pdf");

    const start = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });
    const conversationId = start.body.conversation.id;

    const res = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, body: "What's my child's attendance this term?" });

    expect(res.status).toBe(201);
    expect(res.body.escalated).toBe(false);
    expect(res.body.aiMessage.confidence).toBeGreaterThanOrEqual(0.7);

    const convo = await request(app)
      .get(`/conversations/${conversationId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(convo.body.conversation.status).toBe("OPEN");
    // Regression: GET /conversations/:id must include the student relation
    // (a client needs the child's name to render a conversation header),
    // the same way GET /conversations already does for the list view.
    expect(convo.body.conversation.student.name).toBe("Jane Smith");
  });

  it("escalates an unanswerable question and lets staff resolve it", async () => {
    const { studentId, parentToken } = await setupParentWithStudent(principalToken, schoolId);

    const start = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });
    const conversationId = start.body.conversation.id;

    const res = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, body: "Can we get a puppy for the classroom?" });

    expect(res.status).toBe(201);
    expect(res.body.escalated).toBe(true);

    const escalations = await request(app)
      .get(`/escalations?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    expect(escalations.body.escalations).toHaveLength(1);
    expect(escalations.body.escalations[0].reasonType).toBe("PARENT_QUERY_UNRESOLVED");
    expect(escalations.body.escalations[0].conversationId).toBe(conversationId);

    const internalNote = await request(app)
      .post(`/conversations/${conversationId}/staff-reply`)
      .set("Authorization", `Bearer ${principalToken}`)
      .send({ schoolId, body: "Checking with the principal on this one.", isInternal: true });
    expect(internalNote.status).toBe(201);

    const staffReply = await request(app)
      .post(`/conversations/${conversationId}/staff-reply`)
      .set("Authorization", `Bearer ${principalToken}`)
      .send({ schoolId, body: "Great idea! Let's discuss at the next parent meeting." });
    expect(staffReply.status).toBe(201);

    const parentView = await request(app)
      .get(`/conversations/${conversationId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${parentToken}`);
    const parentBodies = parentView.body.messages.map((m: { body: string }) => m.body);
    expect(parentBodies).not.toContain("Checking with the principal on this one.");
    expect(parentBodies).toContain("Great idea! Let's discuss at the next parent meeting.");

    const staffView = await request(app)
      .get(`/conversations/${conversationId}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${principalToken}`);
    const staffBodies = staffView.body.messages.map((m: { body: string }) => m.body);
    expect(staffBodies).toContain("Checking with the principal on this one.");

    const resolved = await request(app)
      .post(`/conversations/${conversationId}/resolve`)
      .set("Authorization", `Bearer ${principalToken}`)
      .send({ schoolId });
    expect(resolved.body.conversation.status).toBe("RESOLVED");

    const escalationsAfter = await request(app)
      .get(`/escalations?schoolId=${schoolId}&status=RESOLVED`)
      .set("Authorization", `Bearer ${principalToken}`);
    expect(escalationsAfter.body.escalations).toHaveLength(1);
  });

  it("blocks a parent from accessing another parent's conversation", async () => {
    const parentA = await setupParentWithStudent(principalToken, schoolId, "parent-a@test.example");
    const start = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentA.parentToken}`)
      .send({ schoolId, studentId: parentA.studentId });

    await createUser(principalToken, schoolId, { role: "PARENT", email: "parent-b@test.example" });
    const parentB = await login("parent-b@test.example", "Password123!");

    const res = await request(app)
      .get(`/conversations/${start.body.conversation.id}?schoolId=${schoolId}`)
      .set("Authorization", `Bearer ${parentB.token}`);

    expect(res.status).toBe(403);
  });

  it("blocks a parent from using the staff-reply endpoint", async () => {
    const { studentId, parentToken } = await setupParentWithStudent(principalToken, schoolId);
    const start = await request(app)
      .post("/conversations")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, studentId });

    const res = await request(app)
      .post(`/conversations/${start.body.conversation.id}/staff-reply`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ schoolId, body: "trying to reply as staff" });

    expect(res.status).toBe(403);
  });
});
