import { Router } from "express";
import { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { BACK_OFFICE_ROLES, MOBILE_APP_ROLES, personasForRoles } from "./demo.personas.js";

export const demoRouter = Router();

/**
 * Serves the sign-in picker for a demo: the roles an app covers, and the
 * seeded accounts behind each one, passwords included. Unauthenticated by
 * necessity — it is what the demonstrator sees before signing in — and so it
 * is refused outright unless DEMO_MODE is explicitly on.
 *
 * ?app=mobile | back-office narrows the list to the roles that app can serve,
 * so the picker never offers a role that would land on "wrong app".
 */
demoRouter.get(
  "/personas",
  asyncHandler(async (req, res) => {
    if (!env.DEMO_MODE) {
      throw AppError.notFound("Demo mode is not enabled");
    }

    const app = typeof req.query.app === "string" ? req.query.app : undefined;
    const roles: Role[] =
      app === "mobile" ? MOBILE_APP_ROLES : app === "back-office" ? BACK_OFFICE_ROLES : [...BACK_OFFICE_ROLES, ...MOBILE_APP_ROLES];

    res.json({ demoMode: true, groups: personasForRoles(roles) });
  }),
);
