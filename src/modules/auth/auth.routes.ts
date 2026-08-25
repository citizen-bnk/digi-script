import { Router } from "express";
import { z } from "zod";
import type { User } from "@prisma/client";
import { validateBody } from "../../middleware/validate.js";
import { signToken, requireAuth, toAuthenticatedUser } from "../../middleware/auth.js";
import { loginWithPassword } from "./auth.service.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Single public user shape returned by both /login and /me — keeping these
// in sync matters because clients (e.g. the parent PWA) use whichever
// response they have on hand to decide what to fetch next (schoolId, etc.),
// rather than always round-tripping through /me after login.
function toPublicUser(user: User) {
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

// PRD Onboarding: Screen 2 (Login). Phone/MFA verification (Screen 3) is a
// Phase 1.5 concern layered on top of this endpoint.
authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await loginWithPassword(req.body.email, req.body.password);

    const token = signToken(toAuthenticatedUser(user));

    res.json({ user: toPublicUser(user), token });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw AppError.notFound("User not found");
    }
    res.json({ user: toPublicUser(user) });
  }),
);
