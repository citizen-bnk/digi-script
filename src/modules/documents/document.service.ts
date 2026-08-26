import { DocumentStatus, EscalationReasonType, Role, Sensitivity } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { storageService } from "../../services/storage/storage.service.js";
import { categorizationService } from "../../services/ai/categorization.service.js";
import { recordAuditEntry } from "../audit/audit.service.js";
import { createEscalation, resolveEscalationForDocument } from "../escalations/escalation.service.js";
import type { AuthenticatedUser } from "../../types/auth.js";

export interface IngestDocumentInput {
  schoolId: string;
  uploadedByUserId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  studentId?: string;
  academicYear?: string;
  term?: string;
  sensitivity?: Sensitivity;
  textSample?: string;
}

function buildFolderPath(parts: { academicYear?: string; term?: string; category: string }): string {
  return [parts.academicYear ?? "Uncategorized-Year", parts.term ?? "Uncategorized-Term", parts.category]
    .join("/");
}

/**
 * Core document ingestion pipeline (PRD 4.3-4.5, Use Case 2):
 *   upload -> AI categorization -> confidence-threshold routing ->
 *   auto-organized folder path -> escalation queue for low confidence.
 */
export async function ingestDocument(input: IngestDocumentInput) {
  const stored = await storageService.save({
    schoolId: input.schoolId,
    filename: input.filename,
    buffer: input.buffer,
  });

  const { category, confidence, reasons } = await categorizationService.categorize({
    filename: input.filename,
    textSample: input.textSample,
  });

  const categoryRecord = await prisma.documentCategory.upsert({
    where: { name: category },
    create: { name: category },
    update: {},
  });

  const status =
    confidence >= env.AI_CATEGORIZATION_LOW_CONFIDENCE ? DocumentStatus.CATEGORIZED : DocumentStatus.ESCALATED;

  const document = await prisma.document.create({
    data: {
      schoolId: input.schoolId,
      uploadedByUserId: input.uploadedByUserId,
      studentId: input.studentId,
      categoryId: categoryRecord.id,
      categoryConfidence: confidence,
      categoryReasons: reasons,
      originalFilename: input.filename,
      storageKey: stored.storageKey,
      mimeType: input.mimeType,
      sizeBytes: stored.sizeBytes,
      status,
      sensitivity: input.sensitivity ?? Sensitivity.NORMAL,
      academicYear: input.academicYear,
      term: input.term,
      folderPath: buildFolderPath({ academicYear: input.academicYear, term: input.term, category }),
    },
    // Matches what listDocuments and getDocument return. Without it the
    // caller receives a categoryId and no name, and an upload screen has
    // nothing to show for the suggestion it is asking the user to confirm.
    include: { category: true },
  });

  await recordAuditEntry({
    actorUserId: input.uploadedByUserId,
    schoolId: input.schoolId,
    action: "DOCUMENT_UPLOADED",
    targetType: "Document",
    targetId: document.id,
    metadata: { category, confidence, status },
  });

  if (status === DocumentStatus.ESCALATED) {
    await createEscalation({
      schoolId: input.schoolId,
      documentId: document.id,
      studentId: input.studentId,
      reasonType: EscalationReasonType.LOW_CONFIDENCE_CATEGORIZATION,
      reason: `AI confidence ${(confidence * 100).toFixed(0)}% for suggested category "${category}" is below the review threshold`,
      aiConfidence: confidence,
    });
  }

  return document;
}

/**
 * TEACHER and SUPERVISOR are scoped to their assigned class — Application
 * Spec section 2: "Supervisor/Nurse: Access to student records for assigned
 * class/department" and "Teacher/Staff: Access to student records for
 * assigned class". This mirrors the roster, where listStudents and
 * assertCanAccessStudent already narrow both roles the same way; without it
 * a supervisor blocked from a student's record could still read that
 * student's documents.
 *
 * Both see school-wide documents (no student attached) as well. Staff with
 * no class assigned are not narrowed, which is how a supervisor covering the
 * whole school is represented.
 */
const CLASS_SCOPED_ROLES: readonly Role[] = [Role.TEACHER, Role.SUPERVISOR];

function classScopeWhere(user: AuthenticatedUser) {
  if (!CLASS_SCOPED_ROLES.includes(user.role) || !user.assignedClassName) {
    return {};
  }
  return { OR: [{ studentId: null }, { student: { className: user.assignedClassName } }] };
}

export async function listDocuments(
  schoolId: string,
  user: AuthenticatedUser,
  filters: { studentId?: string; status?: DocumentStatus },
) {
  return prisma.document.findMany({
    where: { schoolId, studentId: filters.studentId, status: filters.status, ...classScopeWhere(user) },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

async function findDocumentOrThrow(documentId: string, schoolId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { category: true, student: true },
  });
  if (!document || document.schoolId !== schoolId) {
    throw AppError.notFound("Document not found");
  }
  return document;
}

/**
 * Row-level check for a document already loaded by id. Applies to reads and
 * to category confirmation alike — a class-scoped supervisor who cannot view
 * a document must not be able to recategorize it either.
 */
function assertCanAccessDocument(
  user: AuthenticatedUser,
  document: { studentId: string | null; student: { className: string | null } | null },
) {
  if (
    CLASS_SCOPED_ROLES.includes(user.role) &&
    user.assignedClassName &&
    document.studentId &&
    document.student?.className !== user.assignedClassName
  ) {
    throw AppError.forbidden("You may only access documents for your assigned class");
  }
}

export async function getDocument(user: AuthenticatedUser, documentId: string, schoolId: string) {
  const document = await findDocumentOrThrow(documentId, schoolId);
  assertCanAccessDocument(user, document);
  return document;
}

/** Human override of an AI-suggested category (PRD 4.4 step 6: Confirmation). */
export async function confirmDocumentCategory(
  documentId: string,
  schoolId: string,
  categoryName: string,
  user: AuthenticatedUser,
) {
  const actorUserId = user.id;
  const document = await findDocumentOrThrow(documentId, schoolId);
  assertCanAccessDocument(user, document);

  const categoryRecord = await prisma.documentCategory.upsert({
    where: { name: categoryName },
    create: { name: categoryName },
    update: {},
  });

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      categoryId: categoryRecord.id,
      status: DocumentStatus.CATEGORIZED,
      folderPath: buildFolderPath({
        academicYear: document.academicYear ?? undefined,
        term: document.term ?? undefined,
        category: categoryName,
      }),
    },
  });

  await resolveEscalationForDocument(document.id, actorUserId);

  await recordAuditEntry({
    actorUserId,
    schoolId,
    action: "DOCUMENT_CATEGORY_CONFIRMED",
    targetType: "Document",
    targetId: document.id,
    metadata: { category: categoryName },
  });

  return updated;
}
