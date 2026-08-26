import "dotenv/config";
// Side effect: resolves DATABASE_URL from Vercel's POSTGRES_* variables
// before anything reads it. Must come before the schema is parsed.
import "./database-url.js";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  // Comma-separated list of browser origins allowed to call this API (e.g.
  // the deployed frontend). Unset means "allow any origin", which is fine
  // for local development but not for a public deployment.
  CORS_ORIGIN: z.string().optional(),
  // Demo mode offers the seeded logins through GET /demo/personas so a
  // demonstrator can sign in as any role with one click (no password is
  // ever sent — see src/modules/demo). Defaults ON while the product is in
  // demonstration: every deployment is a demo deployment for now. Set
  // DEMO_MODE=false before any deployment holds real learner data.
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // Only /tmp is writable on a serverless function, and it is wiped between
  // cold starts. That is survivable here because nothing ever reads a
  // document's bytes back — no endpoint serves files. Real durability means
  // swapping in an S3-backed StorageService.
  LOCAL_STORAGE_DIR: z.string().default(process.env.VERCEL ? "/tmp/digiscript-documents" : ".data/documents"),
  AI_CATEGORIZATION_HIGH_CONFIDENCE: z.coerce.number().default(0.85),
  AI_CATEGORIZATION_LOW_CONFIDENCE: z.coerce.number().default(0.7),
  // PRD 4.7: below this, the AI's chat answer is treated as unresolved and
  // handed to the escalation queue rather than sent to the parent as final.
  QUERY_LOW_CONFIDENCE: z.coerce.number().default(0.7),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Thrown when required configuration is missing, carrying the field names so
 * the serverless entrypoint can answer with something better than an opaque
 * 500 — on a platform where the only symptom is a failed invocation, "which
 * variable" is the entire diagnosis.
 */
export class EnvConfigError extends Error {
  readonly fields: Record<string, string[] | undefined>;

  constructor(fields: Record<string, string[] | undefined>) {
    super(`Invalid environment configuration: ${Object.keys(fields).join(", ")}`);
    this.name = "EnvConfigError";
    this.fields = fields;
  }
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    console.error("Invalid environment configuration:", fields);
    throw new EnvConfigError(fields);
  }
  return parsed.data;
}

export const env = loadEnv();
