import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import { redactConnectionStrings } from "../utils/redact.js";
import { env } from "../config/env.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, "Unhandled error");

  // "Internal server error" is the right answer for a deployment holding real
  // records: the detail belongs in the log, not in a stranger's browser. A
  // demo deployment is the opposite case — the log is the one place the
  // person looking at the screen cannot reach, and there is nothing here
  // worth protecting except the credentials, which are stripped.
  const detail = err as { code?: string; name?: string; message?: string } | null;

  res.status(500).json({
    error: "Internal server error",
    ...(env.DEMO_MODE
      ? {
          reason: redactConnectionStrings(detail?.message ?? String(err)),
          code: detail?.code ?? detail?.name ?? null,
        }
      : {}),
  });
}
