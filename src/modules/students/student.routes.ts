import { Router } from "express";
import { z } from "zod";
import { ParentRelationship, Role } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createStudent,
  getOwnStudentRecord,
  getStudent,
  linkParentToStudent,
  listMyChildren,
  listStudents,
  updateStudent,
} from "./student.service.js";

export const studentRouter = Router();

studentRouter.use(requireAuth);

const createStudentSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(1),
  grade: z.string().optional(),
  className: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  emergencyContacts: z.unknown().optional(),
  medicalNotes: z.unknown().optional(),
});

studentRouter.post(
  "/",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const body = createStudentSchema.parse(req.body);
    requireSameSchool(body.schoolId, req.user!);
    const student = await createStudent({ ...body, createdByUserId: req.user!.id });
    res.status(201).json({ student });
  }),
);

// PRD 8 (Parent User Portal): "My Child" — parents see only their linked children.
studentRouter.get(
  "/my-children",
  requireRole(Role.PARENT),
  asyncHandler(async (req, res) => {
    const children = await listMyChildren(req.user!.id);
    res.json({ children });
  }),
);

// Student self-view: login + read-only access to their own record only
// (no courses/assignments/grades — deliberately narrow, see README).
studentRouter.get(
  "/me",
  requireRole(Role.STUDENT),
  asyncHandler(async (req, res) => {
    const student = await getOwnStudentRecord(req.user!);
    res.json({ student });
  }),
);

// Staff roster view, scoped by role: admins see the whole school, teachers/
// supervisors see only their assigned class (PRD 4.8).
studentRouter.get(
  "/",
  requireRole(...ROLE_GROUPS.studentRoster),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const students = await listStudents(schoolId, req.user!);
    res.json({ students });
  }),
);

studentRouter.get(
  "/:studentId",
  asyncHandler(async (req, res) => {
    const student = await getStudent(req.user!, req.params.studentId);
    res.json({ student });
  }),
);

const linkParentSchema = z.object({
  schoolId: z.string().uuid(),
  parentUserId: z.string().uuid(),
  relationship: z.nativeEnum(ParentRelationship).optional(),
});

studentRouter.post(
  "/:studentId/parents",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const body = linkParentSchema.parse(req.body);
    requireSameSchool(body.schoolId, req.user!);
    const link = await linkParentToStudent({ ...body, studentId: req.params.studentId, actorUserId: req.user!.id });
    res.status(201).json({ link });
  }),
);

/**
 * Edits from the back-office student detail screen (Application Spec section
 * 5, "Student Detail Drill-Down"). Nullable fields accept null to clear them
 * — a learner whose class was recorded wrongly needs a way back to blank, and
 * omitting the key means "leave alone", which is a different intent.
 */
const updateStudentSchema = z
  .object({
    name: z.string().min(1).optional(),
    grade: z.string().nullable().optional(),
    className: z.string().nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    emergencyContacts: z.unknown().optional(),
    medicalNotes: z.unknown().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "No fields to update" });

studentRouter.patch(
  "/:studentId",
  requireRole(...ROLE_GROUPS.schoolManagement),
  asyncHandler(async (req, res) => {
    const body = updateStudentSchema.parse(req.body);
    const student = await updateStudent(req.user!, req.params.studentId, body);
    res.json({ student });
  }),
);
