import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";

export interface RegisterSchoolInput {
  schoolName: string;
  address?: string;
  phone?: string;
  principalName: string;
  principalEmail: string;
  principalPassword: string;
}

/**
 * PRD 4.1 School Registration & Profile: principal creates an account and
 * configures the school profile in a single step, becoming the school's
 * first SUPER_USER.
 */
export async function registerSchool(input: RegisterSchoolInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.principalEmail } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.principalPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: input.schoolName,
        address: input.address,
        phone: input.phone,
        principalName: input.principalName,
      },
    });

    const principal = await tx.user.create({
      data: {
        schoolId: school.id,
        role: Role.SUPER_USER,
        name: input.principalName,
        email: input.principalEmail,
        passwordHash,
      },
    });

    return { school, principal };
  });

  await recordAuditEntry({
    actorUserId: result.principal.id,
    schoolId: result.school.id,
    action: "SCHOOL_REGISTERED",
    targetType: "School",
    targetId: result.school.id,
  });

  return result;
}

export async function getSchoolById(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw AppError.notFound("School not found");
  }
  return school;
}
