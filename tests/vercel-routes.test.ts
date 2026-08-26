import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolves a request path through the real vercel.json route table.
 *
 * This exists because a misrouted deployment fails silently: `/api/health`
 * once rewrote to a path no build published, missed the filesystem phase,
 * and fell through the catch-all to the mobile app's index.html — so the API
 * answered every request with a login page, and nothing in the build logs
 * said a word about it. Locally everything kept working, because locally
 * nothing consults this file.
 */
const config = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as {
  builds: Array<{ src: string; use: string; config?: { distDir: string } }>;
  routes: Array<{ src?: string; dest?: string; handle?: string }>;
};

/**
 * With legacy `builds`, a route's dest names the build entrypoint itself —
 * extension and all — which is the form Vercel's own examples use.
 *
 * This file previously stripped the extension, on the reasoning that the
 * published function drops it. Vercel then answered /api/* with a plain-text
 * 404: nothing exists at the stripped path. The test agreed with the config
 * because both encoded the same wrong assumption, which is the trap — so it
 * now derives the expected dest from the build list rather than restating it.
 */
const lambdaPaths = config.builds
  .filter((build) => build.use === "@vercel/node")
  .map((build) => `/${build.src}`);

const staticMounts = config.builds
  .filter((build) => build.use === "@vercel/static-build")
  .map((build) => `/${path.dirname(build.src)}`);

/**
 * Stands in for Vercel's filesystem phase. A function always answers; a
 * static mount only answers when the path names an actual file, which here
 * is approximated by "has an extension" — that keeps the test about the
 * route table rather than about whether someone has run a build.
 * Extension-less paths are SPA routes and must reach the fallback.
 */
function isServable(target: string): boolean {
  if (lambdaPaths.includes(target)) return true;
  const looksLikeAFile = path.extname(target) !== "";
  return looksLikeAFile && staticMounts.some((mount) => target.startsWith(`${mount}/`));
}

/**
 * Two readings of the rewrite phase, because the earlier version of this
 * test encoded only one — and the deployment behaved like the other.
 *
 * "stop" applies the first matching rule and moves on to the filesystem.
 * "continue" keeps applying rules to the rewritten path. Under "continue",
 * a bare `/(.*)` catch-all re-captures a path that an earlier rule already
 * aimed at the function and drags it into the static tree; the request then
 * lands on static hosting, which answers a GET with the SPA shell and a
 * POST with 405. That is precisely what the deployment did while this test
 * was green.
 *
 * Rather than guess which reading is right, the route table is written so
 * that both give the same answer, and both are asserted below.
 */
type Semantics = "stop" | "continue";

function applyPhase(routes: typeof config.routes, from: string, semantics: Semantics): string {
  let current = from;
  for (const route of routes) {
    if (!route.src) continue;
    const match = new RegExp(`^${route.src}$`).exec(current);
    if (!match) continue;
    current = route.dest!.replace(/\$(\d+)/g, (_, group: string) => match[Number(group)] ?? "");
    if (semantics === "stop") break;
  }
  return current;
}

function resolveRoute(requestPath: string, semantics: Semantics = "stop"): string {
  const filesystemIndex = config.routes.findIndex((route) => route.handle === "filesystem");

  const current = applyPhase(config.routes.slice(0, filesystemIndex), requestPath, semantics);
  if (isServable(current)) return current;

  return applyPhase(config.routes.slice(filesystemIndex + 1), current, "stop");
}

const SEMANTICS: Semantics[] = ["stop", "continue"];

describe("vercel.json routing", () => {
  it.each(SEMANTICS)("sends every /api path to the function (%s semantics)", (semantics) => {
    for (const requestPath of ["/api/health", "/api/auth/login", "/api/demo/personas", "/api/demo/seed"]) {
      expect(
        resolveRoute(requestPath, semantics),
        `${requestPath} must reach the API under ${semantics} semantics`,
      ).toBe("/api/index.ts");
    }
  });

  it("keeps the catch-alls from re-capturing an API path", () => {
    // The guard that makes both readings agree. Without it, /api/index is
    // matched again by a bare /(.*) and rewritten into the static tree.
    for (const route of config.routes) {
      if (!route.src || !route.dest?.includes("mobile-app")) continue;
      for (const apiPath of ["/api", "/api/index", "/api/index.ts", "/api/health"]) {
        expect(
          new RegExp(`^${route.src}$`).test(apiPath),
          `${route.src} must not match ${apiPath}`,
        ).toBe(false);
      }
    }
  });

  it("points at a build entrypoint that exists", () => {
    // A dest naming nothing in the deployment is answered by Vercel with a
    // plain-text 404 — not by our app, whose own 404 is JSON. That content
    // type is how the two are told apart from the outside.
    const apiRoute = config.routes.find((route) => route.src === "/api/(.*)");
    expect(apiRoute).toBeDefined();
    expect(lambdaPaths).toContain(apiRoute!.dest);
    expect(apiRoute!.dest).toBe("/api/index.ts");
  });

  it("keeps every dest tied to a declared build", () => {
    // Nothing may point at a path no build produces, whichever build made it.
    const staticRoots = config.builds
      .filter((build) => build.use === "@vercel/static-build")
      .map((build) => `/${path.dirname(build.src)}`);

    for (const route of config.routes) {
      if (!route.dest) continue;
      const known =
        lambdaPaths.includes(route.dest) ||
        staticRoots.some((root) => route.dest!.startsWith(`${root}/`));
      expect(known, `${route.dest} is not produced by any build`).toBe(true);
    }
  });

  it("serves the back office under /admin", () => {
    expect(resolveRoute("/admin")).toBe("/web/back-office/index.html");
    expect(resolveRoute("/admin/dashboard")).toBe("/web/back-office/index.html");
    expect(resolveRoute("/admin/assets/app.js")).toBe("/web/back-office/assets/app.js");
  });

  it("serves the mobile app everywhere else, including deep links", () => {
    expect(resolveRoute("/")).toBe("/web/mobile-app/index.html");
    expect(resolveRoute("/chat")).toBe("/web/mobile-app/index.html");
    expect(resolveRoute("/sw.js")).toBe("/web/mobile-app/sw.js");
  });

  it.each(SEMANTICS)("never lets an API path reach an app's HTML (%s)", (semantics) => {
    // Falling through to static hosting is what produced "Request failed
    // with status 405" on every POST: static serving allows GET and HEAD
    // only, so the method — not the path — was being rejected.
    for (const requestPath of ["/api/health", "/api/students", "/api/anything/at/all"]) {
      expect(resolveRoute(requestPath, semantics)).not.toMatch(/index\.html$/);
      expect(resolveRoute(requestPath, semantics)).not.toMatch(/^\/web\//);
    }
  });
});
