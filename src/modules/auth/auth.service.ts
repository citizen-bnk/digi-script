import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordAuditEntry({
      schoolId: user.schoolId,
      districtId: user.districtId,
      action: "LOGIN_FAILED",
      targetType: "User",
      targetId: user.id,
    });
    throw AppError.unauthorized("Invalid email or password");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAuditEntry({
    actorUserId: user.id,
    schoolId: user.schoolId,
    districtId: user.districtId,
    action: "LOGIN_SUCCESS",
    targetType: "User",
    targetId: user.id,
  });

  return user;
}

/**
 * The single public user shape returned by /auth/login, /auth/me and
 * /demo/login. Keeping one definition matters because clients use whichever
 * response they have on hand to decide what to fetch next (schoolId, and so
 * on) rather than always round-tripping through /me after signing in.
 */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    schoolId: user.schoolId,
    districtId: user.districtId,
    assignedClassName: user.assignedClassName,
    studentId: user.studentId,
  };
}
