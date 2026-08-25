import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";

export interface CreateUserInput {
  schoolId: string;
  createdByUserId: string;
  name: string;
  email: string;
  phone?: string;
  role: Exclude<Role, "SYSTEM_OWNER">;
  temporaryPassword: string;
  assignedClassName?: string;
}

// PRD 4.2 User & Role Management: SUPER_USER creates users and assigns roles
// scoped to their own school.
export async function createSchoolUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("A user with this email already exists");
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
