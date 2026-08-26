import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate.js";
import { signToken, requireAuth, toAuthenticatedUser } from "../../middleware/auth.js";
import { loginWithPassword, toPublicUser } from "./auth.service.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
