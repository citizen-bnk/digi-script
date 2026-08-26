import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { signToken, toAuthenticatedUser } from "../../middleware/auth.js";
import { loginWithPassword, toPublicUser } from "../auth/auth.service.js";
import {
  BACK_OFFICE_ROLES,
  DEMO_PASSWORD,
  DEMO_SCHOOLS,
  findDemoPersona,
  isPersonaEnabled,
  MOBILE_APP_ROLES,
  personasForRoles,
  type SchoolKey,
} from "./demo.personas.js";

export const demoRouter = Router();

/**
 * Every route here is refused unless DEMO_MODE is explicitly on. They are
 * unauthenticated by necessity — this is what a demonstrator uses *before*
 * signing in — so the env gate is the deployment-level guarantee. Which
 * schools actually take part is then a per-school setting a SYSTEM_OWNER
 * controls from the back office.
 */
demoRouter.use((_req, _res, next) => {
  if (!env.DEMO_MODE) {
    throw AppError.notFound("Demo mode is not enabled");
  }
  next();
});

/** Which demo schools currently have the switch on, as persona school keys. */
async function enabledSchoolKeys(): Promise<Set<SchoolKey>> {
  const enabled = await prisma.school.findMany({
    where: { demoModeEnabled: true },
    select: { name: true },
  });
  const enabledNames = new Set(enabled.map((school) => school.name));
  return new Set(DEMO_SCHOOLS.filter((school) => enabledNames.has(school.name)).map((school) => school.key));
}

/**
 * The roles an app covers and the seeded people behind each one, limited to
 * schools with demo mode on. Carries no passwords — see personasForRoles.
 *
 * ?app=mobile | back-office narrows the list to the roles that app can
 * serve, so the picker never offers a role that would land on "wrong app".
 */
demoRouter.get(
  "/personas",
  asyncHandler(async (req, res) => {
    const app = typeof req.query.app === "string" ? req.query.app : undefined;
    const roles: Role[] =
      app === "mobile"
        ? MOBILE_APP_ROLES
        : app === "back-office"
          ? BACK_OFFICE_ROLES
          : [...BACK_OFFICE_ROLES, ...MOBILE_APP_ROLES];

    res.json({ demoMode: true, groups: personasForRoles(roles, await enabledSchoolKeys()) });
  }),
);

const demoLoginSchema = z.object({ email: z.string().email() });

/**
 * Signs in a demo persona by name alone. The server holds the demo password
 * and runs the ordinary password login with it, so this is a real
 * authentication — the same status checks, lastLoginAt update and audit
 * entry — and the credential never reaches the browser.
 *
 * Checked twice over: the address must be one this codebase lists as a demo
 * persona, and that persona's school must currently have demo mode on. So
 * this can neither be aimed at a genuine account sharing the database, nor
 * used to reach a school the district has switched off.
 */
demoRouter.post(
  "/login",
  validateBody(demoLoginSchema),
  asyncHandler(async (req, res) => {
    const persona = findDemoPersona(req.body.email);
    if (!persona) {
      throw AppError.forbidden("Not a demo account");
    }
    if (!isPersonaEnabled(persona, await enabledSchoolKeys())) {
      throw AppError.forbidden("Demo mode is switched off for this school");
    }

    const user = await loginWithPassword(persona.email, DEMO_PASSWORD);
    const token = signToken(toAuthenticatedUser(user));

    res.json({ user: toPublicUser(user), token });
  }),
);
