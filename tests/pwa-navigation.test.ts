import { describe, expect, it } from "vitest";
import { bypassesAppShell } from "../web/mobile-app/pwa-routing.js";

/**
 * The mobile app's service worker answers navigation requests from its
 * precached shell. Its scope is the whole origin, so without a denylist it
 * also answers for the API and the back-office: opening /api/health returned
 * the mobile app, which redirected to /login, and the API looked broken while
 * being healthy. Worse, the request never reached the network, so changes to
 * vercel.json had no observable effect at all.
 */
describe("service worker navigation fallback", () => {
  it("lets API requests reach the network", () => {
    expect(bypassesAppShell("/api")).toBe(true);
    expect(bypassesAppShell("/api/health")).toBe(true);
    expect(bypassesAppShell("/api/demo/personas")).toBe(true);
  });

  it("lets the back-office load its own build", () => {
    expect(bypassesAppShell("/admin")).toBe(true);
    expect(bypassesAppShell("/admin/schools")).toBe(true);
  });

  it("still serves the app shell for the mobile app's own routes", () => {
    for (const path of ["/", "/login", "/chat", "/my-child", "/notifications", "/profile"]) {
      expect(bypassesAppShell(path)).toBe(false);
    }
  });

  it("does not over-match paths that merely start with the same letters", () => {
    expect(bypassesAppShell("/apiary")).toBe(false);
    expect(bypassesAppShell("/administration")).toBe(false);
  });
});
