import bcrypt from "bcryptjs";
import { DocumentStatus, EscalationStatus, Role, UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";
import type { AuthenticatedUser } from "../../types/auth.js";

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

/**
 * Backs the back-office Multi-School Overview (Application Spec section 4).
 * A SYSTEM_OWNER sees every school; anyone else sees only their own, so the
 * same endpoint serves the district portal and a single school's portal
 * without a second code path.
 */
export async function listSchools(user: AuthenticatedUser) {
  const schools = await prisma.school.findMany({
    where: user.role === Role.SYSTEM_OWNER ? {} : { id: user.schoolId ?? "" },
    orderBy: { name: "asc" },
    include: {
      district: { select: { id: true, name: true } },
      _count: { select: { users: true, students: true, documents: true } },
    },
  });

  // Pending escalations are a status filter rather than a plain relation
  // count, so they are tallied in one grouped query instead of N per-school
  // ones.
  const pending = await prisma.escalation.groupBy({
    by: ["schoolId"],
    where: {
      schoolId: { in: schools.map((school) => school.id) },
      status: { in: [EscalationStatus.NEW, EscalationStatus.IN_PROGRESS] },
    },
    _count: { _all: true },
  });
  const pendingBySchool = new Map(pending.map((row) => [row.schoolId, row._count._all]));

  return schools.map(({ _count, ...school }) => ({
    ...school,
    counts: {
      users: _count.users,
      students: _count.students,
      documents: _count.documents,
      pendingEscalations: pendingBySchool.get(school.id) ?? 0,
    },
  }));
}

/** Dashboard cards for a single school (Application Spec section 5). */
export async function getSchoolStats(schoolId: string) {
  const [users, students, documents, pendingEscalations, documentsAwaitingReview] = await Promise.all([
    prisma.user.count({ where: { schoolId, status: UserStatus.ACTIVE } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.document.count({ where: { schoolId } }),
    prisma.escalation.count({
      where: { schoolId, status: { in: [EscalationStatus.NEW, EscalationStatus.IN_PROGRESS] } },
    }),
    prisma.document.count({ where: { schoolId, status: DocumentStatus.ESCALATED } }),
  ]);

  return { users, students, documents, pendingEscalations, documentsAwaitingReview };
}
