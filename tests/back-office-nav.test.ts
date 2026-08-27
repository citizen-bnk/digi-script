import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The back-office menu on a phone.
 *
 * At narrow widths the sidebar was laid out as a full-width block above the
 * page, so every screen opened on the whole navigation with its content
 * somewhere below the fold. It is a drawer now, closed on arrival.
 */
const shell = readFileSync(
  new URL("../web/back-office/src/components/AppShell.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../web/back-office/src/index.css", import.meta.url), "utf8");

describe("the mobile menu", () => {
  it("starts closed", () => {
    expect(shell).toMatch(/useState\(false\)/);
  });

  it("has a hamburger that says what it controls", () => {
    expect(shell).toContain('className="hamburger"');
    expect(shell).toMatch(/aria-expanded=\{menuOpen\}/);
    expect(shell).toMatch(/aria-controls="app-nav"/);
    // The label has to change with the state, or a screen reader announces
    // "open menu" on a menu that is already open.
    expect(shell).toMatch(/aria-label=\{menuOpen \? 'Close menu' : 'Open menu'\}/);
  });

  it("closes on navigation, on Escape, and on a tap outside", () => {
    // Following a link should show the destination, not the menu over it.
    expect(shell).toMatch(/useEffect\(\(\) => \{\s*\n\s*setMenuOpen\(false\)\s*\n\s*\}, \[location\.pathname\]\)/);
    expect(shell).toContain("'Escape'");
    expect(shell).toContain('className="nav-scrim"');
  });

  it("takes the drawer off-screen rather than merely hiding it", () => {
    // display:none would drop it from the accessibility tree entirely; a
    // transform keeps it focusable once opened and animates.
    expect(css).toMatch(/transform: translateX\(-100%\)/);
    expect(css).toMatch(/\.shell\.nav-open \.sidebar \{ transform: translateX\(0\); \}/);
    expect(css).toMatch(/@media \(max-width: 900px\)/);
  });
});

describe("the menu contents", () => {
  it("lists the sections the design shows, marking what is not built", () => {
    for (const label of [
      "Dashboard",
      "Documents",
      "Escalations",
      "Users",
      "Students",
      "Audit Logs",
      "Conversations",
      "Knowledge Base",
      "Financial Management",
      "Feeding Programme",
      "Reports & Analytics",
      "Settings",
      "Integrations",
      "Help & Support",
    ]) {
      expect(shell, `${label} is missing from the menu`).toContain(label);
    }
  });

  it("renders an unbuilt section as inert, not as a link", () => {
    // A link that opens an empty page is worse than an honest label.
    expect(shell).toContain('className="nav-soon"');
    expect(shell).toContain('aria-disabled="true"');
  });

  it("does not let a listed-but-unbuilt section grant route access", () => {
    // RoleRoute authorises against navForRole. If that grew to include the
    // planned entries, listing a section would quietly permit its route.
    expect(shell).toMatch(/export function navForRole[\s\S]*?return CORE\[role\] \?\? \[\]/);
    expect(shell).toMatch(/export function fullNavForRole/);

    const core = shell.slice(shell.indexOf("const CORE"), shell.indexOf("const PLANNED"));
    for (const planned of ["Knowledge Base", "Financial Management", "Integrations"]) {
      expect(core, `${planned} must not be in the authorising list`).not.toContain(planned);
    }
  });
});
