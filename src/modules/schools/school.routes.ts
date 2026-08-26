import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { signToken, toAuthenticatedUser } from "../../middleware/auth.js";
import {
  registerSchool,
  getSchoolById,
  listSchools,
  getSchoolStats,
  setSchoolDemoMode,
} from "./school.service.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const schoolRouter = Router();

const registerSchema = z.object({
  schoolName: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  principalName: z.string().min(2),
  principalEmail: z.string().email(),
  principalPassword: z.string().min(8),
});

schoolRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { school, principal } = await registerSchool(req.body);

    const token = signToken(toAuthenticatedUser(principal));

    res.status(201).json({ school, user: { id: principal.id, email: principal.email, role: principal.role }, token });
  }),
);

// Declared before "/:schoolId" so the literal path is not swallowed by the
// parameterized one.
schoolRouter.get(
  "/",
  requireAuth,
  requireRole(...ROLE_GROUPS.backOffice),
  asyncHandler(async (req, res) => {
    const schools = await listSchools(req.user!);
    res.json({ schools });
  }),
);

schoolRouter.get(
  "/:schoolId",
  requireAuth,
  requireRole(...ROLE_GROUPS.backOffice),
  asyncHandler(async (req, res) => {
    requireSameSchool(req.params.schoolId, req.user!);
    const school = await getSchoolById(req.params.schoolId);
    res.json({ school });
  }),
);

// SYSTEM_OWNER only, deliberately narrower than the rest of this router:
// turning demo mode on exposes a school's staff as one-click logins, which
// is a district-level decision rather than a principal's.
schoolRouter.patch(
  "/:schoolId/demo-mode",
  requireAuth,
  requireRole(Role.SYSTEM_OWNER),
  validateBody(z.object({ enabled: z.boolean() })),
  asyncHandler(async (req, res) => {
    const school = await setSchoolDemoMode(req.params.schoolId, req.body.enabled, req.user!.id);
    res.json({ school: { id: school.id, name: school.name, demoModeEnabled: school.demoModeEnabled } });
  }),
);

schoolRouter.get(
  "/:schoolId/stats",
  requireAuth,
  requireRole(...ROLE_GROUPS.backOffice),
  asyncHandler(async (req, res) => {
    requireSameSchool(req.params.schoolId, req.user!);
    const stats = await getSchoolStats(req.params.schoolId);
    res.json({ stats });
  }),
);
