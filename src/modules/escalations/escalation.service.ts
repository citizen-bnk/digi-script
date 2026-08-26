import { EscalationReasonType, EscalationStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditEntry } from "../audit/audit.service.js";

export interface CreateEscalationInput {
  schoolId: string;
  documentId?: string;
  conversationId?: string;
  studentId?: string;
  reasonType: EscalationReasonType;
  reason: string;
  aiConfidence?: number;
}

/**
 * PRD Use Case 3 (Supervisor Reviews & Escalation): low-confidence
 * categorizations and unresolved parent queries enter a queue that
 * supervisors work from the escalation dashboard.
 */
export async function createEscalation(input: CreateEscalationInput) {
  return prisma.escalation.create({
    data: {
      schoolId: input.schoolId,
      documentId: input.documentId,
      conversationId: input.conversationId,
      studentId: input.studentId,
      reasonType: input.reasonType,
      reason: input.reason,
      aiConfidence: input.aiConfidence,
    },
  });
}

export async function listEscalations(schoolId: string, status?: EscalationStatus) {
  return prisma.escalation.findMany({
    where: { schoolId, status },
    include: { document: true, student: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function assignEscalation(escalationId: string, schoolId: string, assignedToUserId: string) {
  const escalation = await getEscalationOrThrow(escalationId, schoolId);
  return prisma.escalation.update({
    where: { id: escalation.id },
    data: { assignedToUserId, status: EscalationStatus.IN_PROGRESS },
  });
}

export async function resolveEscalation(
  escalationId: string,
  schoolId: string,
  resolvedByUserId: string,
  resolutionNotes: string,
) {
  const escalation = await getEscalationOrThrow(escalationId, schoolId);

  const updated = await prisma.escalation.update({
    where: { id: escalation.id },
    data: {
      status: EscalationStatus.RESOLVED,
      resolutionNotes,
      resolvedAt: new Date(),
    },
  });

  await recordAuditEntry({
    actorUserId: resolvedByUserId,
    schoolId,
    action: "ESCALATION_RESOLVED",
    targetType: "Escalation",
    targetId: escalation.id,
    metadata: { resolutionNotes },
  });

  return updated;
}

/**
 * Auto-resolves the escalation attached to a document (if any and not
 * already resolved) once a human confirms its category — the other half
 * of PRD Use Case 3 ("document auto-organized" / "Mark as Resolved").
 * Silently no-ops if there's no such escalation, so callers that don't
 * know whether a document was ever escalated can call this unconditionally.
 */
export async function resolveEscalationForDocument(documentId: string, resolvedByUserId: string) {
  const escalation = await prisma.escalation.findUnique({ where: { documentId } });
  if (!escalation || escalation.status === EscalationStatus.RESOLVED) {
    return;
  }

  await prisma.escalation.update({
    where: { id: escalation.id },
    data: { status: EscalationStatus.RESOLVED, resolutionNotes: "Resolved via category confirmation", resolvedAt: new Date() },
  });

  await recordAuditEntry({
    actorUserId: resolvedByUserId,
    schoolId: escalation.schoolId,
    action: "ESCALATION_RESOLVED",
    targetType: "Escalation",
    targetId: escalation.id,
    metadata: { resolutionNotes: "Resolved via category confirmation" },
  });
}

async function getEscalationOrThrow(escalationId: string, schoolId: string) {
  const escalation = await prisma.escalation.findUnique({ where: { id: escalationId } });
  if (!escalation || escalation.schoolId !== schoolId) {
    throw AppError.notFound("Escalation not found");
  }
  return escalation;
}
