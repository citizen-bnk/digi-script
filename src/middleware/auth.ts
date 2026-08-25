import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import type { AuthenticatedUser } from "../types/auth.js";

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    role: user.role,
    schoolId: user.schoolId,
    districtId: user.districtId,
    email: user.email,
    assignedClassName: user.assignedClassName,
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing bearer token");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }
}

export function signToken(user: AuthenticatedUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}
