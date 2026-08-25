import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  LOCAL_STORAGE_DIR: z.string().default(".data/documents"),
  AI_CATEGORIZATION_HIGH_CONFIDENCE: z.coerce.number().default(0.85),
  AI_CATEGORIZATION_LOW_CONFIDENCE: z.coerce.number().default(0.7),
  // PRD 4.7: below this, the AI's chat answer is treated as unresolved and
  // handed to the escalation queue rather than sent to the parent as final.
  QUERY_LOW_CONFIDENCE: z.coerce.number().default(0.7),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
