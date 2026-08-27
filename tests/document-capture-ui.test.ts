import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * How a document gets into the app on a phone.
 *
 * The screen had one file input carrying capture="environment", which does
 * open the camera — and *only* the camera, so a photo already in the gallery
 * or a PDF that arrived by email could not be sent at all. The attribute is
 * the whole difference between the two behaviours, so the fix is separate
 * inputs rather than one shared control.
 */
const source = readFileSync(
  new URL("../web/mobile-app/src/screens/supervisor/UploadDocumentScreen.tsx", import.meta.url),
  "utf8",
);

describe("capturing a document", () => {
  it("offers the camera, the gallery and the file picker separately", () => {
    expect(source).toContain("Take Photo");
    expect(source).toContain("Choose Files");
    expect(source).toContain("Browse");

    // Three inputs, exactly one of which forces the camera. Matched as an
    // attribute on its own line so prose mentioning it does not count.
    expect(source.match(/\n\s+type="file"/g) ?? []).toHaveLength(3);
    expect(source.match(/\n\s+capture="environment"/g) ?? []).toHaveLength(1);
  });

  it("accepts images for the camera and PDFs for the picker", () => {
    expect(source).toMatch(/accept="image\/\*"\s*\n\s*capture="environment"/);
    expect(source).toMatch(/accept="image\/\*,application\/pdf,\.pdf"/);
  });

  it("shows the capture back before it is sent", () => {
    // A photograph taken on a phone is easy to get wrong; the design reviews
    // it before upload rather than after.
    expect(source).toContain("URL.createObjectURL");
    expect(source).toContain("capture-preview");
    expect(source).toContain("Retake");
  });

  it("releases each preview it replaces", () => {
    // An object URL pins the file in memory until it is revoked, and a
    // capture screen makes a new one every time somebody retakes a photo.
    expect(source).toContain("URL.revokeObjectURL");
  });

  it("sends the file as multipart, with the school it belongs to", () => {
    expect(source).toContain("new FormData()");
    expect(source).toMatch(/form\.append\('file', file\)/);
    expect(source).toMatch(/form\.append\('schoolId'/);
  });
});
