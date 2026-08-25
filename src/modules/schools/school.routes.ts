import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { signToken, toAuthenticatedUser } from "../../middleware/auth.js";
import { registerSchool, getSchoolById, listSchools, getSchoolStats } from "./school.service.js";
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
