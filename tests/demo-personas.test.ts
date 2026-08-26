import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

/**
 * The persona list has to say more than "here are the roles". An empty list
 * arrives in two very different situations — nothing seeded yet, and a system
 * owner having switched every school off — and the login screens must respond
 * to them in opposite ways: offer to load demo data, or explain that the demo
 * is deliberately off. Getting that wrong put a "Load demo data" button in
 * front of demonstrators whose real problem was a switch.
 *
 * DEMO_MODE is off for the rest of the suite, so this file rebuilds the
 * module graph with it on.
 */
let app: Express;
let prisma: typeof import("../src/db/prisma.js")["prisma"];
let seedDemoData: typeof import("../src/modules/demo/demo.seed.js")["seedDemoData"];

beforeAll(async () => {
  vi.resetModules();
  process.env.DEMO_MODE = "true";
  ({ prisma } = await import("../src/db/prisma.js"));
  ({ seedDemoData } = await import("../src/modules/demo/demo.seed.js"));
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

async function personas(appName: "mobile" | "back-office") {
  const res = await request(app).get(`/demo/personas?app=${appName}`);
  expect(res.status).toBe(200);
  return res.body as {
    demoMode: boolean;
    seeded: boolean;
    schools: { name: string; seeded: boolean; demoModeEnabled: boolean }[];
    groups: { role: string; users: unknown[] }[];
  };
}

describe("demo personas", () => {
  it("reports an empty database as unseeded, not as switched off", async () => {
    const body = await personas("mobile");
    expect(body.seeded).toBe(false);
    expect(body.groups).toEqual([]);
    expect(body.schools.every((school) => !school.seeded)).toBe(true);
  });

  it("lists the roles once the district is seeded", async () => {
    await seedDemoData();
    const body = await personas("mobile");

    expect(body.seeded).toBe(true);
    expect(body.groups.length).toBeGreaterThan(0);
    for (const group of body.groups) {
      expect(group.users.length).toBeGreaterThan(0);
    }
  });

  it("drops a school's people when its switch goes off", async () => {
    await seedDemoData();
    const before = await personas("mobile");
    const countBefore = before.groups.reduce((n, g) => n + g.users.length, 0);

    await prisma.school.updateMany({
      where: { name: "Lethabo Primary School" },
      data: { demoModeEnabled: false },
    });

    const after = await personas("mobile");
    const countAfter = after.groups.reduce((n, g) => n + g.users.length, 0);

    expect(countAfter).toBeLessThan(countBefore);
    expect(after.schools.find((s) => s.name === "Lethabo Primary School")?.demoModeEnabled).toBe(
      false,
    );
  });

  it("still reports seeded when every school is switched off", async () => {
    // This is the case the login screens were getting wrong: no personas, but
    // loading demo data is not the remedy and would be refused anyway.
    await seedDemoData();
    await prisma.school.updateMany({ data: { demoModeEnabled: false } });

    const body = await personas("mobile");
    expect(body.groups).toEqual([]);
    expect(body.seeded).toBe(true);
    expect(body.schools.every((school) => school.demoModeEnabled === false)).toBe(true);
  });

  it("keeps district roles available so the demo can be switched back on", async () => {
    // District personas belong to no school. If turning the last school off
    // also hid them, nobody could sign in to turn one back on.
    await seedDemoData();
    await prisma.school.updateMany({ data: { demoModeEnabled: false } });

    const body = await personas("back-office");
    expect(body.groups.some((group) => group.role === "SYSTEM_OWNER")).toBe(true);
  });

  it("refuses demo sign-in for a school that is switched off", async () => {
    await seedDemoData();
    await prisma.school.updateMany({
      where: { name: "Lethabo Primary School" },
      data: { demoModeEnabled: false },
    });

    const res = await request(app)
      .post("/demo/login")
      .send({ email: "tshepo.radebe@lethabo.demo" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/switched off/i);
  });
});
