import bcrypt from "bcryptjs";
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
