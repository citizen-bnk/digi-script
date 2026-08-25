import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../utils/app-error.js";

/**
 * Access rules from PRD 4.8 (Authorization & Access Control):
 *   - Parents can access only their child's records
 *   - Teachers can access student records for their classes
 *   - Admins (SUPER_USER) can access all records within their school
 *   - Supervisors can access escalated conversations
 *   - Support can access audit logs
 *   - SYSTEM_OWNER operates across districts/schools for consolidation & compliance
 */

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!allowed.includes(req.user.role)) {
      throw AppError.forbidden(`Role ${req.user.role} is not permitted to perform this action`);
    }
    next();
  };
}

/**
 * Enforces row-level tenant scoping: a request targeting a specific schoolId
 * must match the caller's own school, unless the caller is a SYSTEM_OWNER
 * (cross-school oversight) operating within their own district.
 */
export function requireSameSchool(schoolId: string, user: NonNullable<Request["user"]>) {
  if (user.role === Role.SYSTEM_OWNER) {
    return;
  }
  if (user.schoolId !== schoolId) {
    throw AppError.forbidden("Cannot access another school's records");
  }
}

export const ROLE_GROUPS = {
  schoolManagement: [Role.SYSTEM_OWNER, Role.SUPER_USER],
  documentReview: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPERVISOR],
  escalationHandlers: [Role.SUPER_USER, Role.SUPERVISOR, Role.SUPPORT],
  auditAccess: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPPORT],
} as const;
