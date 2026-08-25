import {
  ConversationStatus,
  DocumentStatus,
  EscalationReasonType,
  EscalationStatus,
  Role,
  SenderType,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import type { AuthenticatedUser } from "../../types/auth.js";
import { recordAuditEntry } from "../audit/audit.service.js";
import { createEscalation } from "../escalations/escalation.service.js";
import { assertCanAccessStudent } from "../students/student.service.js";
import { queryService } from "../../services/ai/query.service.js";

/**
 * Starts a new conversation, or returns the parent's existing open one
 * about this student, so repeated questions land in the same thread
 * (PRD 4.7: "Multi-turn conversations (remember context)").
 */
export async function getOrCreateConversation(
  user: AuthenticatedUser,
  input: { schoolId: string; studentId?: string },
) {
  if (input.studentId) {
    await assertCanAccessStudent(user, input.studentId);
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      schoolId: input.schoolId,
      parentUserId: user.id,
      studentId: input.studentId,
      status: { not: ConversationStatus.RESOLVED },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return existing;
  }

  const conversation = await prisma.conversation.create({
    data: { schoolId: input.schoolId, parentUserId: user.id, studentId: input.studentId },
  });

  await recordAuditEntry({
    actorUserId: user.id,
    schoolId: input.schoolId,
    action: "CONVERSATION_STARTED",
    targetType: "Conversation",
    targetId: conversation.id,
  });

  return conversation;
}

async function getConversationOrThrow(conversationId: string, schoolId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.schoolId !== schoolId) {
    throw AppError.notFound("Conversation not found");
  }
  return conversation;
}

function assertCanViewConversation(
  user: AuthenticatedUser,
  conversation: { parentUserId: string; schoolId: string },
) {
  if (user.role === Role.SYSTEM_OWNER) {
    return;
  }
  if (conversation.schoolId !== user.schoolId) {
    throw AppError.forbidden("Cannot access another school's conversations");
  }
  if (user.role === Role.PARENT && conversation.parentUserId !== user.id) {
    throw AppError.forbidden("Parents may only access their own conversations");
  }
}

/**
 * Parent sends a message; the AI drafts a reply from the student's
 * categorized documents (PRD Use Case 1). Below QUERY_LOW_CONFIDENCE the
 * conversation is escalated instead of treating the AI answer as final.
 */
export async function sendParentMessage(input: {
  conversationId: string;
  schoolId: string;
  parentUserId: string;
  body: string;
}) {
  const conversation = await getConversationOrThrow(input.conversationId, input.schoolId);
  if (conversation.parentUserId !== input.parentUserId) {
    throw AppError.forbidden("Parents may only post in their own conversations");
  }

  const parentMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: SenderType.PARENT,
      senderUserId: input.parentUserId,
      body: input.body,
    },
  });

  await recordAuditEntry({
    actorUserId: input.parentUserId,
    schoolId: input.schoolId,
    action: "CONVERSATION_MESSAGE_SENT",
    targetType: "Conversation",
    targetId: conversation.id,
  });

  const candidateDocuments = conversation.studentId
    ? await prisma.document.findMany({
        where: { schoolId: input.schoolId, studentId: conversation.studentId, status: DocumentStatus.CATEGORIZED },
        include: { category: true },
      })
    : [];

  const { answer, confidence, sourceDocumentIds } = await queryService.answer({
    question: input.body,
    documents: candidateDocuments.map((doc) => ({
      id: doc.id,
      category: doc.category?.name ?? "Other",
      originalFilename: doc.originalFilename,
    })),
  });

  const aiMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: SenderType.AI,
      body: answer,
      confidence,
    },
  });

  await recordAuditEntry({
    schoolId: input.schoolId,
    action: "AI_RESPONSE_GENERATED",
    targetType: "Conversation",
    targetId: conversation.id,
    metadata: { confidence, sourceDocumentIds },
  });

  let escalated = false;
  if (confidence < env.QUERY_LOW_CONFIDENCE) {
    escalated = true;
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: ConversationStatus.ESCALATED },
    });

    const alreadyEscalated = await prisma.escalation.findFirst({
      where: { conversationId: conversation.id, status: { not: EscalationStatus.RESOLVED } },
    });
    if (!alreadyEscalated) {
      await createEscalation({
        schoolId: input.schoolId,
        conversationId: conversation.id,
        studentId: conversation.studentId ?? undefined,
        reasonType: EscalationReasonType.PARENT_QUERY_UNRESOLVED,
        reason: `AI confidence ${(confidence * 100).toFixed(0)}% answering: "${input.body}"`,
        aiConfidence: confidence,
      });
    }
  }

  return { parentMessage, aiMessage, escalated };
}

/** Staff reply — either sent to the parent, or an internal-only note (PRD:
 * "Respond to Parent" screen's "Add Note (internal)" field). */
export async function sendStaffReply(input: {
  conversationId: string;
  schoolId: string;
  staffUserId: string;
  body: string;
  isInternal: boolean;
}) {
  const conversation = await getConversationOrThrow(input.conversationId, input.schoolId);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: SenderType.STAFF,
      senderUserId: input.staffUserId,
      body: input.body,
      isInternal: input.isInternal,
    },
  });

  await recordAuditEntry({
    actorUserId: input.staffUserId,
    schoolId: input.schoolId,
    action: input.isInternal ? "CONVERSATION_INTERNAL_NOTE_ADDED" : "CONVERSATION_STAFF_REPLY_SENT",
    targetType: "Conversation",
    targetId: conversation.id,
  });

  return message;
}

export async function resolveConversation(conversationId: string, schoolId: string, actorUserId: string) {
  const conversation = await getConversationOrThrow(conversationId, schoolId);

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: ConversationStatus.RESOLVED },
  });

  await prisma.escalation.updateMany({
    where: { conversationId: conversation.id, status: { not: EscalationStatus.RESOLVED } },
    data: { status: EscalationStatus.RESOLVED, resolutionNotes: "Resolved via conversation", resolvedAt: new Date() },
  });

  await recordAuditEntry({
    actorUserId,
    schoolId,
    action: "CONVERSATION_RESOLVED",
    targetType: "Conversation",
    targetId: conversation.id,
  });

  return updated;
}

export async function getConversation(user: AuthenticatedUser, conversationId: string, schoolId: string) {
  const conversation = await getConversationOrThrow(conversationId, schoolId);
  assertCanViewConversation(user, conversation);

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id, isInternal: user.role === Role.PARENT ? false : undefined },
    orderBy: { createdAt: "asc" },
  });

  return { conversation, messages };
}

export async function listConversations(
  user: AuthenticatedUser,
  schoolId: string,
  status?: ConversationStatus,
) {
  const where =
    user.role === Role.PARENT
      ? { schoolId, parentUserId: user.id, status }
      : { schoolId, status };

  return prisma.conversation.findMany({
    where,
    include: { student: true, parent: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { updatedAt: "desc" },
  });
}
