import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

/**
 * `path.join("", id)` yields a bare relative name, so an empty
 * LOCAL_STORAGE_DIR turned the first upload into
 * "ENOENT: no such file or directory, mkdir '<uuid>'" — an error that names
 * neither storage nor the setting behind it.
 *
 * A relative path is the same trap more slowly: it resolves against the
 * working directory, which on a serverless runtime is read-only, so it fails
 * at the first upload rather than at startup.
 */
const SAVED = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  delete process.env.VERCEL;
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  delete process.env.LAMBDA_TASK_ROOT;
});

afterEach(() => {
  process.env = { ...SAVED };
  vi.restoreAllMocks();
});

async function storageDir() {
  const { env } = await import("../src/config/env.js");
  return env.LOCAL_STORAGE_DIR;
}

describe("document storage directory", () => {
  it("is always absolute", async () => {
    process.env.LOCAL_STORAGE_DIR = ".data/documents";
    expect(path.isAbsolute(await storageDir())).toBe(true);
  });

  it("never resolves to nothing when the value is blank", async () => {
    process.env.LOCAL_STORAGE_DIR = "";
    const dir = await storageDir();
    expect(path.isAbsolute(dir)).toBe(true);
    // The actual failure: a school id joined onto "" is just the id.
    expect(path.join(dir, "04abd161-6236")).not.toBe("04abd161-6236");
  });

  it("uses /tmp on a serverless runtime, where nothing else is writable", async () => {
    process.env.VERCEL = "1";
    delete process.env.LOCAL_STORAGE_DIR;
    expect(await storageDir()).toBe("/tmp/digiscript-documents");
  });

  it("detects the Lambda runtime even when VERCEL is absent", async () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "some-function";
    delete process.env.LOCAL_STORAGE_DIR;
    expect(await storageDir()).toBe("/tmp/digiscript-documents");
  });

  it("redirects an unwritable path to /tmp rather than failing at upload", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.VERCEL = "1";
    process.env.LOCAL_STORAGE_DIR = "/var/task/documents";

    expect(await storageDir()).toBe("/tmp/digiscript-documents");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not writable"));
  });

  it("leaves a /tmp path alone", async () => {
    process.env.VERCEL = "1";
    process.env.LOCAL_STORAGE_DIR = "/tmp/somewhere-else";
    expect(await storageDir()).toBe("/tmp/somewhere-else");
  });

  it("does not redirect anything when running normally", async () => {
    process.env.LOCAL_STORAGE_DIR = "/srv/digiscript/documents";
    expect(await storageDir()).toBe("/srv/digiscript/documents");
  });
});
