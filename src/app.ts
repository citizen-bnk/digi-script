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

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "digiscript-core" });
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
