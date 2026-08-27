import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";
import type { AuthenticatedUser } from "../../types/auth.js";

export interface CreateUserInput {
  schoolId: string;
  createdByUserId: string;
  name: string;
  email: string;
  phone?: string;
  role: Exclude<Role, "SYSTEM_OWNER">;
  temporaryPassword: string;
  assignedClassName?: string;
  // Required when role is STUDENT — the Student record this login maps to.
  studentId?: string;
}

// PRD 4.2 User & Role Management: SUPER_USER creates users and assigns roles
// scoped to their own school.
export async function createSchoolUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("A user with this email already exists");
  }

  if (input.role === Role.STUDENT) {
    if (!input.studentId) {
      throw AppError.badRequest("studentId is required when role is STUDENT");
    }
    const student = await prisma.student.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== input.schoolId) {
      throw AppError.notFound("Student not found");
    }
    const existingLogin = await prisma.user.findUnique({ where: { studentId: input.studentId } });
    if (existingLogin) {
      throw AppError.conflict("This student already has a login");
    }
  }

  const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);

  const user = await prisma.user.create({
    data: {
      schoolId: input.schoolId,
      role: input.role,
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      assignedClassName: input.assignedClassName,
      studentId: input.role === Role.STUDENT ? input.studentId : undefined,
    },
  });

  await recordAuditEntry({
    actorUserId: input.createdByUserId,
    schoolId: input.schoolId,
    action: "USER_CREATED",
    targetType: "User",
    targetId: user.id,
    metadata: { role: input.role },
  });

  return user;
}

export async function listSchoolUsers(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      assignedClassName: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function deactivateUser(userId: string, actorUserId: string, schoolId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.schoolId !== schoolId) {
    throw AppError.notFound("User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.INACTIVE },
  });

  // Deactivation revokes access but preserves the audit trail (PRD 5:
  // "User Detail Drill-Down ... Deactivate User: Revoke access immediately,
  // audit trail preserved").
  await recordAuditEntry({
    actorUserId,
    schoolId,
    action: "USER_DEACTIVATED",
    targetType: "User",
    targetId: userId,
  });

  return updated;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string | null;
  role?: Exclude<Role, "SYSTEM_OWNER" | "STUDENT">;
  assignedClassName?: string | null;
  status?: UserStatus;
}

/**
 * Edits a staff/parent account from the back-office detail screen.
 *
 * Three things this deliberately will not do:
 *   - grant or revoke SYSTEM_OWNER. That role crosses schools, so it cannot
 *     be handed out by a school-scoped edit; and a SYSTEM_OWNER's own record
 *     is not editable through a school's user list.
 *   - move an account into or out of STUDENT. A student login is bound to a
 *     Student record by a unique studentId, so switching role would leave
 *     either a dangling link or a STUDENT with nothing to view. Creating the
 *     login handles that pairing; changing it is a different operation.
 *   - let a caller change their own role or status. Demoting or deactivating
 *     yourself locks you out mid-request, and the recovery path is a database
 *     edit.
 */
export async function updateSchoolUser(
  userId: string,
  actorUserId: string,
  schoolId: string,
  patch: UpdateUserInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.schoolId !== schoolId) {
    throw AppError.notFound("User not found");
  }

  if (user.role === Role.SYSTEM_OWNER) {
    throw AppError.forbidden("A system owner account cannot be edited from a school's user list");
  }
  if (user.role === Role.STUDENT && patch.role !== undefined) {
    throw AppError.badRequest("A student login's role cannot be changed");
  }
  if (userId === actorUserId && (patch.role !== undefined || patch.status !== undefined)) {
    throw AppError.badRequest("You cannot change your own role or status");
  }

  const data = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as UpdateUserInput;

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("No fields to update");
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  await recordAuditEntry({
    actorUserId,
    schoolId,
    action: "USER_UPDATED",
    targetType: "User",
    targetId: userId,
    // Role and status are the fields that change what someone can reach, so
    // the trail carries the new value, not just the field name.
    metadata: {
      fields: Object.keys(data).sort(),
      ...(data.role ? { role: data.role } : {}),
      ...(data.status ? { status: data.status } : {}),
    },
  });

  return updated;
}

/**
 * The single-user read behind the back-office detail screen.
 *
 * A SYSTEM_OWNER is not scoped to one school, and neither are the people they
 * work alongside: district staff have schoolId null. Matching on schoolId
 * alone 404s on exactly those accounts, which is what an audit entry about a
 * district director links to. So for a district caller the lookup widens to
 * their district — their own record included — and stays a strict
 * same-school match for everyone else.
 */
export async function getSchoolUser(userId: string, schoolId: string, caller?: AuthenticatedUser) {
  if (caller?.role === Role.SYSTEM_OWNER) {
    return getDistrictUser(userId, caller.districtId ?? null);
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      assignedClassName: true,
      studentId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }
  return user;
}

async function getDistrictUser(userId: string, districtId: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      assignedClassName: true,
      studentId: true,
      districtId: true,
      lastLoginAt: true,
      createdAt: true,
      school: { select: { districtId: true } },
    },
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  // Reachable either by belonging to the district directly (district staff)
  // or through a school that does. A district owner with no district of their
  // own reaches nobody, rather than everybody.
  const inDistrict =
    districtId != null && (user.districtId === districtId || user.school?.districtId === districtId);
  if (!inDistrict) {
    throw AppError.notFound("User not found");
  }

  const { districtId: _districtId, school: _school, ...rest } = user;
  return rest;
}
