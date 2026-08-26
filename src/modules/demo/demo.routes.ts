import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { signToken, toAuthenticatedUser } from "../../middleware/auth.js";
import { loginWithPassword, toPublicUser } from "../auth/auth.service.js";
import { seedDemoData } from "./demo.seed.js";
import jwt from "jsonwebtoken";
import type { Request } from "express";
import type { AuthenticatedUser } from "../../types/auth.js";
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
 * Reads the bearer token if one is present, without demanding it. The seed
 * route needs "who is this, if anyone" rather than requireAuth's "there must
 * be somebody", since the first seed of an empty database has no caller.
 */
async function authenticatedUserOrNull(req: Request): Promise<AuthenticatedUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

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

/**
 * The demo schools as they currently stand in the database: whether each one
 * exists yet, and whether its switch is on. Both frontends need this to tell
 * apart the two ways the persona list comes back empty — nothing seeded, and
 * every school switched off — which call for opposite responses.
 */
async function demoSchoolState() {
  const rows = await prisma.school.findMany({
    where: { name: { in: DEMO_SCHOOLS.map((school) => school.name) } },
    select: { name: true, demoModeEnabled: true },
  });
  const byName = new Map(rows.map((row) => [row.name, row.demoModeEnabled]));

  const schools = DEMO_SCHOOLS.map((school) => ({
    key: school.key,
    name: school.name,
    seeded: byName.has(school.name),
    demoModeEnabled: byName.get(school.name) ?? false,
  }));

  return {
    schools,
    enabledKeys: new Set(schools.filter((s) => s.demoModeEnabled).map((s) => s.key as SchoolKey)),
  };
}

/** Which demo schools currently have the switch on, as persona school keys. */
async function enabledSchoolKeys(): Promise<Set<SchoolKey>> {
  return (await demoSchoolState()).enabledKeys;
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

    const { schools, enabledKeys } = await demoSchoolState();
    const groups = personasForRoles(roles, enabledKeys);

    // `seeded` answers "does the demo district exist yet". Without it an
    // empty group list is ambiguous, and the apps were offering to load demo
    // data when the real cause was a system owner switching every school off.
    res.json({
      demoMode: true,
      seeded: schools.some((school) => school.seeded),
      schools,
      groups,
    });
  }),
);

/**
 * Loads (or reloads) the demo district. This exists so a deployment can be
 * populated without local tooling — a serverless demo has no shell to run
 * `npm run seed` from.
 *
 * It is destructive: it clears prior data and starts over. So it is open
 * only while the database is empty, which is a state nobody can lose
 * anything from. Once there are users, re-seeding requires a SYSTEM_OWNER
 * token — the same person who controls demo mode per school.
 */
demoRouter.post(
  "/seed",
  asyncHandler(async (req, res) => {
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
      const user = await authenticatedUserOrNull(req);
      if (user?.role !== Role.SYSTEM_OWNER) {
        throw AppError.forbidden(
          "This database already has data. Re-seeding requires a SYSTEM_OWNER token.",
        );
      }
    }

    try {
      const summary = await seedDemoData();
      res.json({ seeded: true, summary });
    } catch (error) {
      // The generic 500 handler hides the reason in a function log, which on
      // a hosted deployment means the one person who needs it cannot see it.
      // Seeding runs only in demo mode, against data nobody owns, so the
      // failure itself is safe to return — with the connection string
      // scrubbed, since Prisma puts it in some messages verbatim.
      const detail = error as { code?: string; name?: string; message?: string } | null;
      logger.error({ err: error }, "Demo seed failed");

      res.status(500).json({
        error: "Loading the demo data failed part-way through.",
        reason: redactConnectionStrings(detail?.message ?? String(error)),
        code: detail?.code ?? detail?.name ?? null,
      });
    }
  }),
);

/**
 * Prisma includes the datasource URL in several of its error messages, and
 * that URL carries the database password. Anything sent to a browser has to
 * have it removed first.
 */
function redactConnectionStrings(message: string): string {
  return message
    .replace(/\b[a-z]+(?:ql)?:\/\/[^\s"']+/gi, "[connection string removed]")
    .slice(0, 600);
}

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
