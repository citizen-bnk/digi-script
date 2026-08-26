import { describe, expect, it } from "vitest";

/**
 * When something answers in front of the API — deployment access
 * protection, a proxy error page, a rewrite falling through to the SPA
 * shell — it replies with HTML, not JSON.
 *
 * The clients used to read that as `body = undefined` and, on a 2xx, hand
 * the caller `undefined` with no error at all. The login screens then
 * rendered no demo section and reported nothing wrong, which is exactly what
 * an access wall in front of a Vercel deployment produces. Both clients keep
 * their own copy of this logic, so both are checked here.
 *
 * These exercise the shipped source rather than a re-description of it: the
 * files are read and the guard is asserted to be present and to name the
 * cause, which is what turns a blank screen into a diagnosis.
 */
import { readFileSync } from "node:fs";

const clients = [
  ["mobile app", "web/mobile-app/src/api/client.ts"],
  ["back office", "web/back-office/src/api/client.ts"],
] as const;

describe.each(clients)("api client (%s)", (_name, path) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("refuses a non-JSON response instead of returning undefined", () => {
    // The guard must fire on its own, not only inside the !res.ok branch —
    // an access wall can answer 200.
    expect(source).toMatch(/if \(!isJson\) \{\s*\n\s*throw new ApiError/);
  });

  it("names an HTML answer as something standing in front of the API", () => {
    expect(source).toContain("text/html");
    expect(source).toMatch(/access protection/i);
  });

  it("explains a 405 as the request never reaching the API", () => {
    // Static hosting allows GET and HEAD only, so a rejected method means the
    // /api rewrite fell through to the static build.
    expect(source).toContain('res.status === 405')
    expect(source).toMatch(/static file hosting/i)
  })

  it("still surfaces the API's own error message when it sends one", () => {
    // A real 403 from our own code carries {error}; that must win over the
    // generic description.
    expect(source).toMatch(/body\?\.error \?\? describeNonJson/);
  });
});
