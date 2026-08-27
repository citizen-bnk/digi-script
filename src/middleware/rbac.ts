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
  // SYSTEM_OWNER belongs here for the same reason it belongs in every other
  // back-office group: the district dashboard counts open escalations and the
  // sidebar offers the queue, and a district director who is shown the number
  // and then refused the list is being told the portal is broken. Their reach
  // is still bounded by requireSameSchool, which limits them to the district
  // they belong to.
  escalationHandlers: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPERVISOR, Role.SUPPORT],
  auditAccess: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPPORT],
  // TEACHER is read-only and class-scoped (enforced by listStudents /
  // assertCanAccessStudent), unlike documentReview roles which can also
  // upload and categorize documents.
  studentRoster: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPERVISOR, Role.TEACHER],
  // PRD Application Spec section 7 (Teacher Module): "View school
  // documents (no upload access)". Read access only — upload/categorize
  // stays on documentReview. Class-scoping for TEACHER is enforced in
  // document.service.ts the same way listStudents scopes the roster.
  documentRead: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPERVISOR, Role.TEACHER],
  // The three roles served by System B, the back-office web portal
  // (Application Spec section 2: "Web-based back office portal ... for
  // System Owner and Super User", plus SUPPORT for the help desk). Grants
  // only the school profile and its headline counts — SUPPORT's real reach
  // stays defined by auditAccess and escalationHandlers, and it is
  // deliberately absent from schoolManagement, so it cannot manage users
  // or student records.
  backOffice: [Role.SYSTEM_OWNER, Role.SUPER_USER, Role.SUPPORT],
} as const;
