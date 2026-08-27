import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

/**
 * The demo is judged on whether its screens have anything in them. A seed
 * that inserts rows but leaves a role staring at an empty list is a failed
 * demo, and nothing else in the suite would notice — the endpoints all work,
 * they just return nothing.
 *
 * So this signs in as every persona and asserts that what their screens read
 * actually comes back populated, through the real API rather than by
 * counting rows.
 */
let app: Express;
let seed: () => Promise<unknown>;

beforeAll(async () => {
  vi.resetModules();
  process.env.DEMO_MODE = "true";
  ({ seedDemoData: seed } = await import("../src/modules/demo/demo.seed.js"));
  const { createApp } = await import("../src/app.js");
  app = createApp();
}, 60_000);

// The suite truncates every table between tests, so the demo has to be laid
// down again for each one. Assertions are grouped rather than split one per
// screen to keep the number of seeds — and the wall time — reasonable.
beforeEach(async () => {
  await seed();
}, 60_000);

async function signIn(email: string) {
  const res = await request(app).post("/demo/login").send({ email });
  expect(res.status, `${email} could not sign in`).toBe(200);
  return { token: res.body.token as string, user: res.body.user as { schoolId?: string } };
}

/** Fetches a path as `email` and returns the first array in the response. */
async function listAs(email: string, path: (schoolId: string) => string) {
  const { token, user } = await signIn(email);
  const res = await request(app)
    .get(path(user.schoolId ?? ""))
    .set("Authorization", `Bearer ${token}`);

  expect(res.status, `${path(user.schoolId ?? "")} failed for ${email}`).toBe(200);
  const list = Object.values(res.body).find(Array.isArray) as unknown[] | undefined;
  expect(list, `${path(user.schoolId ?? "")} returned no list`).toBeDefined();
  return list!;
}

describe("what each role sees", () => {
  it("the parent has a chat list, children, and a two-sided thread", async () => {
    expect((await listAs("zanele.mahlangu@gmail.demo", (s) => `/conversations?schoolId=${s}`)).length)
      .toBeGreaterThanOrEqual(3);
    expect((await listAs("zanele.mahlangu@gmail.demo", () => "/students/my-children")).length)
      .toBeGreaterThanOrEqual(2);

    const { token, user } = await signIn("zanele.mahlangu@gmail.demo");
    const list = await request(app)
      .get(`/conversations?schoolId=${user.schoolId}`)
      .set("Authorization", `Bearer ${token}`);

    const thread = await request(app)
      .get(`/conversations/${list.body.conversations[0].id}?schoolId=${user.schoolId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(thread.status).toBe(200);
    const senders = new Set(thread.body.messages.map((m: { senderType: string }) => m.senderType));
    // A thread of only questions would show an app that never answers.
    expect(senders.has("PARENT")).toBe(true);
    expect(senders.size).toBeGreaterThan(1);
  });

  it("the learner and teacher see their own scoped slice", async () => {
    const { token } = await signIn("palesa.ndlovu@lethabo.demo");
    const own = await request(app).get("/students/me").set("Authorization", `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.student?.name).toBe("Palesa Ndlovu");

    const teacher = await listAs("tshepo.radebe@lethabo.demo", (s) => `/students?schoolId=${s}`);
    expect(teacher.length).toBeGreaterThanOrEqual(5);
    expect((await listAs("tshepo.radebe@lethabo.demo", (s) => `/documents?schoolId=${s}`)).length)
      .toBeGreaterThanOrEqual(5);

    // Filling the roll is only worth doing if scoping survives it.
    const principal = await listAs("thandiwe.mokoena@lethabo.demo", (s) => `/students?schoolId=${s}`);
    expect(teacher.length).toBeLessThan(principal.length);
  });

  it.each([
    ["lerato.molefe@lethabo.demo", "Lethabo"],
    ["ayanda.khumalo@masibambane.demo", "Masibambane"],
  ])("the supervisor at %s has a queue with every status in it", async (email) => {
    const queue = (await listAs(email, (s) => `/escalations?schoolId=${s}`)) as {
      status: string;
    }[];
    const statuses = new Set(queue.map((e) => e.status));
    // A queue that is all NEW shows nothing about the other two tabs.
    for (const status of ["NEW", "IN_PROGRESS", "RESOLVED"]) {
      expect(statuses.has(status), `${email} has no ${status} escalation`).toBe(true);
    }
  });

  it("the principal has every back-office list populated", async () => {
    const email = "thandiwe.mokoena@lethabo.demo";
    expect((await listAs(email, (s) => `/documents?schoolId=${s}`)).length).toBeGreaterThanOrEqual(10);
    expect((await listAs(email, (s) => `/students?schoolId=${s}`)).length).toBeGreaterThanOrEqual(10);
    expect((await listAs(email, (s) => `/users?schoolId=${s}`)).length).toBeGreaterThanOrEqual(3);
    expect((await listAs(email, (s) => `/escalations?schoolId=${s}`)).length).toBeGreaterThanOrEqual(3);
    expect((await listAs(email, (s) => `/audit?schoolId=${s}`)).length).toBeGreaterThanOrEqual(10);
  });

  it("the district roles and the second school are populated", async () => {
    expect((await listAs("nomsa.dlamini@gauteng-east.demo", () => "/schools")).length).toBe(2);

    expect((await listAs("refilwe.sebe@gauteng-east.demo", (s) => `/escalations?schoolId=${s}`)).length)
      .toBeGreaterThanOrEqual(3);
    expect((await listAs("refilwe.sebe@gauteng-east.demo", (s) => `/audit?schoolId=${s}`)).length)
      .toBeGreaterThanOrEqual(10);

    // The second school is easy to leave thin; the demo switches between them.
    const bongani = "bongani.zulu@masibambane.demo";
    expect((await listAs(bongani, (s) => `/students?schoolId=${s}`)).length).toBeGreaterThanOrEqual(5);
    expect((await listAs(bongani, (s) => `/documents?schoolId=${s}`)).length).toBeGreaterThanOrEqual(5);
  });

  it("documents land across many categories, not all in one", async () => {
    const docs = (await listAs("thandiwe.mokoena@lethabo.demo", (s) => `/documents?schoolId=${s}`)) as {
      category?: { name: string } | null;
    }[];
    const categories = new Set(docs.map((d) => d.category?.name).filter(Boolean));
    // The categorizer is the product; one bucket would hide whether it works.
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });
});
