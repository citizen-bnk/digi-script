import { ParentRelationship, Role } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";
import type { AuthenticatedUser } from "../../types/auth.js";

export interface CreateStudentInput {
  schoolId: string;
  createdByUserId: string;
  name: string;
  grade?: string;
  className?: string;
  dateOfBirth?: Date;
  emergencyContacts?: unknown;
  medicalNotes?: unknown;
}

export async function createStudent(input: CreateStudentInput) {
  const student = await prisma.student.create({
    data: {
      schoolId: input.schoolId,
      name: input.name,
      grade: input.grade,
      className: input.className,
      dateOfBirth: input.dateOfBirth,
      emergencyContacts: input.emergencyContacts as never,
      medicalNotes: input.medicalNotes as never,
    },
  });

  await recordAuditEntry({
    actorUserId: input.createdByUserId,
    schoolId: input.schoolId,
    action: "STUDENT_CREATED",
    targetType: "Student",
    targetId: student.id,
  });

  return student;
}

/**
 * Role-scoped student listing (PRD 4.8):
 *   - SYSTEM_OWNER / SUPER_USER see every student in the school.
 *   - TEACHER / SUPERVISOR see only their assigned class.
 *   - PARENT sees only their linked children (use listMyChildren instead —
 *     this function is for staff-facing roster views).
 */
export async function listStudents(schoolId: string, user: AuthenticatedUser) {
  const classScope =
    (user.role === Role.TEACHER || user.role === Role.SUPERVISOR) && user.assignedClassName
      ? user.assignedClassName
      : undefined;

  return prisma.student.findMany({
    where: { schoolId, className: classScope },
    orderBy: { name: "asc" },
  });
}

export async function listMyChildren(parentUserId: string) {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentUserId },
    include: { student: true },
  });
  return links.map((link) => ({ ...link.student, relationship: link.relationship }));
}

/**
 * Central authorization check reused by any module that needs to verify a
 * user may view/act on a specific student (chat, documents, escalations).
 * Throws AppError.forbidden/notFound rather than returning a boolean so
 * callers can't accidentally skip the check.
 */
export async function assertCanAccessStudent(user: AuthenticatedUser, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw AppError.notFound("Student not found");
  }

  if (user.role === Role.SYSTEM_OWNER) {
    return student;
  }

  if (student.schoolId !== user.schoolId) {
    throw AppError.forbidden("Cannot access another school's student records");
  }

  if (user.role === Role.PARENT) {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentUserId_studentId: { parentUserId: user.id, studentId } },
    });
    if (!link) {
      throw AppError.forbidden("Parents may only access their own child's records");
    }
    return student;
  }

  if (user.role === Role.TEACHER || user.role === Role.SUPERVISOR) {
    if (user.assignedClassName && student.className !== user.assignedClassName) {
      throw AppError.forbidden("Staff may only access students in their assigned class");
    }
  }

  return student;
}

export async function getStudent(user: AuthenticatedUser, studentId: string) {
  return assertCanAccessStudent(user, studentId);
}

export interface LinkParentInput {
  schoolId: string;
  studentId: string;
  parentUserId: string;
  relationship?: ParentRelationship;
  actorUserId: string;
}

export async function linkParentToStudent(input: LinkParentInput) {
  const [student, parent] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId } }),
    prisma.user.findUnique({ where: { id: input.parentUserId } }),
  ]);

  if (!student || student.schoolId !== input.schoolId) {
    throw AppError.notFound("Student not found");
  }
  if (!parent || parent.schoolId !== input.schoolId || parent.role !== Role.PARENT) {
    throw AppError.badRequest("Target user is not a parent in this school");
  }

  const link = await prisma.parentStudentLink.upsert({
    where: { parentUserId_studentId: { parentUserId: input.parentUserId, studentId: input.studentId } },
    create: {
      parentUserId: input.parentUserId,
      studentId: input.studentId,
      relationship: input.relationship ?? ParentRelationship.GUARDIAN,
    },
    update: { relationship: input.relationship ?? ParentRelationship.GUARDIAN },
  });

  await recordAuditEntry({
    actorUserId: input.actorUserId,
    schoolId: input.schoolId,
    action: "PARENT_LINKED_TO_STUDENT",
    targetType: "Student",
    targetId: input.studentId,
    metadata: { parentUserId: input.parentUserId },
  });

  return link;
}
