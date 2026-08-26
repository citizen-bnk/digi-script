import { Router } from "express";
import { z } from "zod";
import { ConversationStatus, Role } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  getConversation,
  getOrCreateConversation,
  listConversations,
  resolveConversation,
  sendParentMessage,
  sendStaffReply,
} from "./conversation.service.js";

export const conversationRouter = Router();

conversationRouter.use(requireAuth);

const startSchema = z.object({
  schoolId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
});

// PRD Use Case 1 / Application Spec 8 (Parent chat dashboard): a parent
// starts, or resumes, a conversation about their child.
conversationRouter.post(
  "/",
  requireRole(Role.PARENT),
  asyncHandler(async (req, res) => {
    const body = startSchema.parse(req.body);
    requireSameSchool(body.schoolId, req.user!);
    const conversation = await getOrCreateConversation(req.user!, body);
    res.status(201).json({ conversation });
  }),
);

conversationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const conversations = await listConversations(
      req.user!,
      schoolId,
      req.query.status as ConversationStatus | undefined,
    );
    res.json({ conversations });
  }),
);

conversationRouter.get(
  "/:conversationId",
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    const result = await getConversation(req.user!, req.params.conversationId, schoolId);
    res.json(result);
  }),
);

const messageSchema = z.object({
  schoolId: z.string().uuid(),
  body: z.string().min(1),
});

conversationRouter.post(
  "/:conversationId/messages",
  requireRole(Role.PARENT),
  asyncHandler(async (req, res) => {
    const { schoolId, body } = messageSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const result = await sendParentMessage({
      conversationId: req.params.conversationId,
      schoolId,
      parentUserId: req.user!.id,
      body,
    });
    res.status(201).json(result);
  }),
);

const staffReplySchema = z.object({
  schoolId: z.string().uuid(),
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
});

// PRD "Respond to Parent" screen: staff reply, or an internal-only note.
conversationRouter.post(
  "/:conversationId/staff-reply",
  requireRole(...ROLE_GROUPS.escalationHandlers),
  asyncHandler(async (req, res) => {
    const { schoolId, body, isInternal } = staffReplySchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const message = await sendStaffReply({
      conversationId: req.params.conversationId,
      schoolId,
      staffUserId: req.user!.id,
      body,
      isInternal,
    });
    res.status(201).json({ message });
  }),
);

const resolveSchema = z.object({ schoolId: z.string().uuid() });

conversationRouter.post(
  "/:conversationId/resolve",
  requireRole(...ROLE_GROUPS.escalationHandlers),
  asyncHandler(async (req, res) => {
    const { schoolId } = resolveSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const conversation = await resolveConversation(req.params.conversationId, schoolId, req.user!.id);
    res.json({ conversation });
  }),
);
