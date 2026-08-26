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

/** @vercel/node publishes a function at its entrypoint path minus the extension. */
const lambdaPaths = config.builds
  .filter((build) => build.use === "@vercel/node")
  .map((build) => `/${build.src.replace(/\.[^.]+$/, "")}`);

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

function resolveRoute(requestPath: string): string {
  const filesystemIndex = config.routes.findIndex((route) => route.handle === "filesystem");
  let current = requestPath;

  for (const route of config.routes.slice(0, filesystemIndex)) {
    const match = new RegExp(`^${route.src}$`).exec(current);
    if (match) {
      current = route.dest!.replace(/\$(\d+)/g, (_, group: string) => match[Number(group)] ?? "");
      break;
    }
  }

  if (isServable(current)) return current;

  for (const route of config.routes.slice(filesystemIndex + 1)) {
    const match = new RegExp(`^${route.src}$`).exec(current);
    if (match) {
      return route.dest!.replace(/\$(\d+)/g, (_, group: string) => match[Number(group)] ?? "");
    }
  }
  return current;
}

describe("vercel.json routing", () => {
  it("sends every /api path to the serverless function", () => {
    for (const requestPath of ["/api/health", "/api/auth/login", "/api/demo/personas", "/api/demo/seed"]) {
      expect(resolveRoute(requestPath), `${requestPath} must reach the API`).toBe("/api/index");
    }
  });

  it("names a dest the builds actually publish", () => {
    // The original bug in one line: dest pointed at "/api/index.ts", which no
    // build ever emits, so the route quietly did nothing.
    const apiRoute = config.routes.find((route) => route.src === "/api/(.*)");
    expect(apiRoute).toBeDefined();
    expect(lambdaPaths).toContain(apiRoute!.dest);
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

  it("never lets an API path fall through to an app's HTML", () => {
    for (const requestPath of ["/api/health", "/api/students", "/api/anything/at/all"]) {
      expect(resolveRoute(requestPath)).not.toMatch(/index\.html$/);
    }
  });
});
