import express, { type Express } from "express";
import cors from "cors";
import { default as helmet } from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { schoolRouter } from "./modules/schools/school.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { studentRouter } from "./modules/students/student.routes.js";
import { documentRouter } from "./modules/documents/document.routes.js";
import { escalationRouter } from "./modules/escalations/escalation.routes.js";
import { conversationRouter } from "./modules/conversations/conversation.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { demoRouter } from "./modules/demo/demo.routes.js";
import { prisma } from "./db/prisma.js";

export function createApp(): Express {
  const app = express();

  // Behind a platform load balancer (Render, Fly, a reverse proxy), the
  // client's real address arrives in X-Forwarded-For; without this Express
  // reports the proxy's address instead, which would make request logs and
  // any future IP-based limiting useless.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const allowedOrigins = env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : {}));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  /**
   * Liveness and readiness in one place, unauthenticated on purpose: when a
   * deployment misbehaves this is the first thing anyone can reach, and the
   * useful question is never "is the process up" but "can it serve".
   *
   * So it reports whether demo mode is on and whether the database is both
   * reachable and migrated. A demo that silently shows no accounts and a
   * database that is unreachable look identical from the browser; this tells
   * them apart without a dashboard login. It names no connection details.
   */
  app.get("/health", async (_req, res) => {
    const database = await checkDatabase();
    const ok = database.status === "ok";

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      service: "digiscript-core",
      demoMode: env.DEMO_MODE,
      database,
    });
  });

  app.use("/auth", authRouter);
  app.use("/schools", schoolRouter);
  app.use("/users", userRouter);
  app.use("/students", studentRouter);
  app.use("/documents", documentRouter);
  app.use("/escalations", escalationRouter);
  app.use("/conversations", conversationRouter);
  app.use("/audit", auditRouter);
  app.use("/demo", demoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Distinguishes the three ways the database can be unusable, because the
 * remedy differs completely: no connection configured, a connection that
 * cannot be reached, and a reachable database whose schema predates the
 * code — the last of which looks like a working deployment right up until a
 * query touches the missing column.
 */
async function checkDatabase(): Promise<{ status: string; detail?: string }> {
  try {
    // Touches a column added by the most recent migration, so a database
    // that is reachable but un-migrated fails here rather than later, in
    // whichever request happens to need it first.
    await prisma.school.findFirst({ select: { id: true, demoModeEnabled: true } });
    return { status: "ok" };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;

    if (code === "P2021" || code === "P2022") {
      return {
        status: "schema-out-of-date",
        detail: "The database is reachable but migrations have not been applied to it.",
      };
    }

    return {
      status: "unreachable",
      detail: "The database could not be reached. Check the connection settings and redeploy.",
    };
  }
}
