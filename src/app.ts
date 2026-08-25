import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { schoolRouter } from "./modules/schools/school.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { documentRouter } from "./modules/documents/document.routes.js";
import { escalationRouter } from "./modules/escalations/escalation.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "digiscript-core" });
  });

  app.use("/auth", authRouter);
  app.use("/schools", schoolRouter);
  app.use("/users", userRouter);
  app.use("/documents", documentRouter);
  app.use("/escalations", escalationRouter);
  app.use("/audit", auditRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
