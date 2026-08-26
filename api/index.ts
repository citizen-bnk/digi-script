/**
 * Vercel serverless entrypoint. The same Express app that `npm run dev`
 * serves, exported as a handler so the API runs alongside the two frontends
 * in one deployment — same origin, so there is no CORS to configure and no
 * second URL to keep in sync.
 *
 * vercel.json routes /api/* here, so the app is mounted under /api to match.
 */
import express from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  MIGRATION_URL_KEYS,
  RUNTIME_URL_KEYS,
} from "../src/config/resolve-database-url.mjs";

const app = express();

/**
 * Building the app reads configuration, which throws when a required
 * variable is missing. Left uncaught that surfaces as a blank 500 with the
 * reason buried in a function log — so catch it and answer with the field
 * names instead. On a platform where the only visible symptom is a failed
 * invocation, knowing *which* variable is the whole diagnosis.
 */
async function mount() {
  try {
    const { createApp } = await import("../src/app.js");
    app.use("/api", createApp());
  } catch (error) {
    // EnvConfigError carries the offending field names. Read them
    // structurally rather than by instanceof: the failure happens *during*
    // the import that would define the class, so it may not be loadable here.
    const fields = (error as { fields?: Record<string, unknown> } | null)?.fields;
    const missing = fields ? Object.keys(fields) : [];

    console.error("API failed to start:", error);

    app.use("/api", (_req, res) => {
      res.status(503).json({
        error: missing.length
          ? `The API is not configured. Set these environment variables and redeploy: ${missing.join(", ")}.`
          : "The API failed to start. Check the deployment logs.",
        missingConfiguration: missing,
        // Naming DATABASE_URL alone is misleading on a platform that sets a
        // different name: someone attaching a managed Postgres gets
        // POSTGRES_* and would otherwise hand-paste a pooled URL over it,
        // losing the unpooled connection migrations need.
        ...(missing.includes("DATABASE_URL")
          ? {
              databaseUrlAlternatives: [...RUNTIME_URL_KEYS, ...MIGRATION_URL_KEYS],
              hint: "Attaching a managed Postgres sets these for you; any one of the runtime names satisfies DATABASE_URL. Environment variables only reach deployments built after they are added, so redeploy once they are set.",
            }
          : {}),
      });
    });
  }
}

const ready = mount();

/**
 * Node's raw request/response is what arrives here — Vercel invokes this the
 * way `http.createServer` would, not with Express's enriched objects. Express
 * accepts either, and awaiting `ready` first means a cold start cannot race
 * the dynamic import that mounts the app.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app(req, res);
}
