import { Router } from "express";
import { z } from "zod";
import { EscalationStatus } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { assignEscalation, listEscalations, resolveEscalation } from "./escalation.service.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const escalationRouter = Router();

escalationRouter.use(requireAuth, requireRole(...ROLE_GROUPS.escalationHandlers));

escalationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const escalations = await listEscalations(schoolId, req.query.status as EscalationStatus | undefined);
    res.json({ escalations });
  }),
);

const assignSchema = z.object({ schoolId: z.string().uuid(), assignedToUserId: z.string().uuid() });

escalationRouter.post(
  "/:escalationId/assign",
  asyncHandler(async (req, res) => {
    const { schoolId, assignedToUserId } = assignSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const escalation = await assignEscalation(req.params.escalationId, schoolId, assignedToUserId);
    res.json({ escalation });
  }),
);

const resolveSchema = z.object({ schoolId: z.string().uuid(), resolutionNotes: z.string().min(1) });

escalationRouter.post(
  "/:escalationId/resolve",
  asyncHandler(async (req, res) => {
    const { schoolId, resolutionNotes } = resolveSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const escalation = await resolveEscalation(req.params.escalationId, schoolId, req.user!.id, resolutionNotes);
    res.json({ escalation });
  }),
);
