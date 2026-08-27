import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import {
  createSchoolUser,
  deactivateUser,
  getSchoolUser,
  listSchoolUsers,
  updateSchoolUser,
} from "./user.service.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const userRouter = Router();

userRouter.use(requireAuth);

const createUserSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["SUPER_USER", "SUPERVISOR", "TEACHER", "PARENT", "SUPPORT", "STUDENT"]),
  temporaryPassword: z.string().min(8),
  assignedClassName: z.string().optional(),
  studentId: z.string().uuid().optional(),
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

userRouter.get(
  "/:userId",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const user = await getSchoolUser(req.params.userId, schoolId, req.user!);
    res.json({ user });
  }),
);

/**
 * Edits from the back-office user detail screen. schoolId is required in the
 * body for the same reason the other write routes require it: the tenant
 * check happens before the record is read, so a caller cannot probe another
 * school's ids by watching which ones come back 404 rather than 403.
 */
const updateUserSchema = z
  .object({
    schoolId: z.string().uuid(),
    name: z.string().min(2).optional(),
    phone: z.string().nullable().optional(),
    role: z.enum(["SUPER_USER", "SUPERVISOR", "TEACHER", "PARENT", "SUPPORT"]).optional(),
    assignedClassName: z.string().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 1, { message: "No fields to update" });

userRouter.patch(
  "/:userId",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const { schoolId, ...patch } = updateUserSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const user = await updateSchoolUser(req.params.userId, req.user!.id, schoolId, patch);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        assignedClassName: user.assignedClassName,
      },
    });
  }),
);
