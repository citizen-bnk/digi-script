import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { createSchoolUser, deactivateUser, listSchoolUsers } from "./user.service.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const userRouter = Router();

userRouter.use(requireAuth);

const createUserSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["SUPER_USER", "SUPERVISOR", "TEACHER", "PARENT", "SUPPORT"]),
  temporaryPassword: z.string().min(8),
});

userRouter.post(
  "/",
  requireRole(...ROLE_GROUPS.schoolManagement),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    requireSameSchool(req.body.schoolId, req.user!);
    const user = await createSchoolUser({ ...req.body, createdByUserId: req.user!.id });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }),
);

userRouter.get(
  "/",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const users = await listSchoolUsers(schoolId);
    res.json({ users });
  }),
);

userRouter.post(
  "/:userId/deactivate",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const schoolId = req.body.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const user = await deactivateUser(req.params.userId, req.user!.id, schoolId);
    res.json({ user: { id: user.id, status: user.status } });
  }),
);
