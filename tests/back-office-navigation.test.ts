import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The back office as something you can move around in.
 *
 * Every screen used to be a terminus. The dashboard reported nine open
 * escalations and gave no way to reach them; the roster listed learners and
 * no row opened; a corrected class name could not be saved at all, because
 * there was no endpoint for it. What that adds up to is a portal you read
 * rather than one you work in.
 *
 * These check the wiring, not the rendering: that the counters are real
 * links, that the rows carry a destination, and that a detail screen saves
 * through the API rather than only displaying.
 */
function read(path: string): string {
  return readFileSync(new URL(`../web/back-office/${path}`, import.meta.url), "utf8");
}

describe("dashboard counters", () => {
  const dashboard = read("src/screens/DashboardScreen.tsx");
  const tile = read("src/components/Tile.tsx");

  it("are anchors, not divs with a click handler", () => {
    // A real link is right-clickable, middle-clickable and announced as a
    // link; an onClick div is none of those.
    expect(tile).toMatch(/<Link to=\{to\} className="tile tile-link">/);
  });

  it("still renders a plain tile when a count has nowhere to go", () => {
    expect(tile).toMatch(/if \(!to\) return <div className="tile">/);
  });

  it("sends each school count to the list it counted", () => {
    expect(dashboard).toMatch(/label="Active staff &amp; users"[\s\S]{0,120}to="\/users"/);
    expect(dashboard).toMatch(/label="Students"[\s\S]{0,120}to="\/students"/);
    expect(dashboard).toMatch(/label="Documents"[\s\S]{0,120}to="\/documents"/);
    expect(dashboard).toMatch(/label="Open escalations"[\s\S]{0,200}to="\/escalations"/);
  });

  it("opens the library pre-filtered from the awaiting-review count", () => {
    // This was a hint inside the Documents tile, which would have made it a
    // link inside a link — something no browser renders as written.
    expect(dashboard).toContain('to="/documents?status=ESCALATED"');
  });

  it("keeps district totals pointed at the school breakdown", () => {
    // A district total spans schools and every list here is scoped to one,
    // so a roster link would land on a screen whose number disagrees with
    // the tile that opened it.
    expect(dashboard).toMatch(/label="Students \(district\)"[\s\S]{0,120}to="\/schools"/);
    expect(dashboard).toMatch(/label="Documents \(district\)"[\s\S]{0,120}to="\/schools"/);
  });
});

describe("the documents list", () => {
  const documents = read("src/screens/DocumentsScreen.tsx");

  it("reads its filter from the URL so a counter can pre-filter it", () => {
    expect(documents).toContain("useSearchParams");
    expect(documents).toMatch(/params\.get\('status'\)/);
  });

  it("opens the document from anywhere in the row", () => {
    expect(documents).toMatch(/className="clickable" onClick=\{\(\) => navigate\(`\/documents\/\$\{doc\.id\}`\)\}/);
  });
});

describe("list rows", () => {
  it("open the student's detail screen", () => {
    expect(read("src/screens/StudentsScreen.tsx")).toMatch(
      /navigate\(`\/students\/\$\{student\.id\}`\)/,
    );
  });

  it("open the user's detail screen", () => {
    expect(read("src/screens/UsersScreen.tsx")).toMatch(/navigate\(`\/users\/\$\{user\.id\}`\)/);
  });

  it("keep the deactivate button from opening the row it sits in", () => {
    // Without this, clicking Deactivate also navigates, and the user lands on
    // a detail screen wondering whether the click registered.
    expect(read("src/screens/UsersScreen.tsx")).toMatch(
      /<td onClick=\{\(e\) => e\.stopPropagation\(\)\}>/,
    );
  });
});

describe("audit entries", () => {
  const helper = read("src/lib/audit-target.ts");

  it("resolve to the screen that holds the target", () => {
    expect(helper).toContain("case 'Document':");
    expect(helper).toContain("case 'Student':");
    expect(helper).toContain("case 'User':");
  });

  it("stay inert for a target this portal has no screen for", () => {
    // A Conversation lives in the mobile app and an Escalation has no URL of
    // its own — linking either one lands the reader on a redirect.
    expect(helper).toMatch(/default:\s*\n\s*return null/);
    expect(helper).toMatch(/if \(!targetId\) return null/);
  });

  it("are used by both the audit log and the dashboard's activity list", () => {
    expect(read("src/screens/AuditScreen.tsx")).toContain("auditTargetPath");
    expect(read("src/screens/DashboardScreen.tsx")).toContain("auditTargetPath");
  });
});

describe("the detail screens", () => {
  const student = read("src/screens/StudentDetailScreen.tsx");
  const user = read("src/screens/UserDetailScreen.tsx");

  it("are routed, and behind the same role check as their list", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/students\/:studentId"[\s\S]{0,120}RoleRoute path="\/students"/);
    expect(app).toMatch(/path="\/users\/:userId"[\s\S]{0,120}RoleRoute path="\/users"/);
  });

  it("save through the API rather than only displaying", () => {
    expect(student).toContain("api.updateStudent(");
    expect(user).toContain("api.updateUser(");
  });

  it("send null for a field the editor emptied", () => {
    // "" would store a blank string that reads as a real value; the two
    // intents — leave alone, and clear — have to stay distinguishable.
    expect(student).toMatch(/grade: form\.grade\.trim\(\) \|\| null/);
    expect(student).toMatch(/className: form\.className\.trim\(\) \|\| null/);
  });

  it("re-sync the form when a save hands back a new record", () => {
    // Otherwise the next edit is made against values the server replaced.
    expect(student).toMatch(/useEffect\([\s\S]{0,400}\}, \[student\]\)/);
    expect(user).toMatch(/useEffect\([\s\S]{0,400}\}, \[user\]\)/);
  });

  it("drop a stale class when a role stops being class-scoped", () => {
    // Otherwise the old scope comes back the moment the role does.
    expect(user).toMatch(/assignedClassName: classScoped \? form\.assignedClassName\.trim\(\) \|\| null : null/);
  });

  it("disable what the API would refuse for your own account", () => {
    expect(user).toContain("const isSelf = me?.id === user.id");
    expect(user).toMatch(/disabled=\{isSelf\}/);
  });
});

describe("the document viewer", () => {
  const preview = read("src/components/DocumentPreview.tsx");

  it("fetches the bytes with the token rather than pointing an <img> at the API", () => {
    expect(preview).toMatch(/api\s*\n?\s*\.documentFile\(documentId, schoolId\)/);
    expect(preview).toContain("URL.createObjectURL");
  });

  it("revokes the object URL, which otherwise pins every opened file in memory", () => {
    expect(preview).toContain("URL.revokeObjectURL");
  });

  it("picks a renderer from the type instead of assuming an image", () => {
    expect(preview).toMatch(/mimeType \?\? ''\)\.startsWith\('image\/'\)/);
    expect(preview).toMatch(/mimeType \?\? ''\)\.includes\('pdf'\)/);
  });

  it("is on the detail screen, which used to say no preview existed", () => {
    const detail = read("src/screens/DocumentDetailScreen.tsx");
    expect(detail).toContain("<DocumentPreview");
    expect(detail).not.toMatch(/no preview or download/i);
  });
});

describe("the mobile app's document viewer", () => {
  const mobile = readFileSync(
    new URL("../web/mobile-app/src/components/DocumentPreview.tsx", import.meta.url),
    "utf8",
  );

  it("exists too — a scanning app whose captures cannot be reopened asks for blind trust", () => {
    expect(mobile).toMatch(/api\s*\n?\s*\.documentFile\(documentId, schoolId\)/);
    expect(mobile).toContain("URL.revokeObjectURL");
  });

  it("is shown above the metadata, since the first question is whether the photo came out", () => {
    const detail = readFileSync(
      new URL("../web/mobile-app/src/screens/shared/DocumentDetailScreen.tsx", import.meta.url),
      "utf8",
    );
    const preview = detail.indexOf("<DocumentPreview");
    const filename = detail.indexOf("{doc.originalFilename}");
    expect(preview).toBeGreaterThan(-1);
    expect(preview).toBeLessThan(filename);
  });
});

describe("both API clients", () => {
  it.each([
    ["back office", "web/back-office/src/api/client.ts"],
    ["mobile app", "web/mobile-app/src/api/client.ts"],
  ])("fetch file bytes outside the JSON path (%s)", (_name, path) => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    // request() throws on any non-JSON response, by design — the bytes need
    // their own path rather than a hole punched in that guard.
    expect(source).toContain("async function requestBlob");
    expect(source).toContain("return res.blob()");
    // A rejected token has to sign the app out here too, or the viewer is
    // the one place a stale session fails silently.
    expect(source).toMatch(/requestBlob[\s\S]{0,1200}UNAUTHORIZED_EVENT/);
  });
});
