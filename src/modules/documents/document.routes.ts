import { Router } from "express";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { storageService } from "../../services/storage/storage.service.js";
import { DocumentStatus, Sensitivity } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { confirmDocumentCategory, getDocument, ingestDocument, listDocuments } from "./document.service.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);

/**
 * A serverless request body is capped at about 4.5 MB by the platform, well
 * under multer's old 100 MB. Anything larger never reached this code: the
 * platform rejected it first, with a page that said nothing about file size.
 * Refusing it here gives the uploader a reason it can act on.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

/** Turns multer's own rejections into the API's error shape. */
function handleUploadErrors(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if ((err as { code?: string } | null)?.code === "LIMIT_FILE_SIZE") {
    next(
      AppError.badRequest(
        `That file is larger than the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB upload limit.`,
      ),
    );
    return;
  }
  next(err);
}

const uploadMetaSchema = z.object({
  schoolId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  sensitivity: z.nativeEnum(Sensitivity).optional(),
});

// PRD 4.3 Document Ingestion Engine / Use Case 2: upload -> AI categorization.
documentRouter.post(
  "/",
  requireRole(...ROLE_GROUPS.documentReview),
  upload.single("file"),
  handleUploadErrors,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest("A file is required (multipart field 'file')");
    }
    const meta = uploadMetaSchema.parse(req.body);
    requireSameSchool(meta.schoolId, req.user!);

    // The categorizer is built to read document text, but this endpoint had
    // no way to supply it, so every uploaded file was categorized on its
    // filename alone. Decoding the head of the buffer as UTF-8 is a
    // dev-grade stand-in for extraction: for a text upload it is the
    // document, and for a binary PDF it is noise that matches no keyword —
    // no worse than the filename-only behaviour it replaces. Real
    // extraction (PDF parsing, OCR) belongs behind CategorizationService.
    const textSample = req.file.buffer.subarray(0, 4096).toString("utf8");

    const document = await ingestDocument({
      schoolId: meta.schoolId,
      uploadedByUserId: req.user!.id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      textSample,
      studentId: meta.studentId,
      academicYear: meta.academicYear,
      term: meta.term,
      sensitivity: meta.sensitivity,
    });

    res.status(201).json({ document });
  }),
);

documentRouter.get(
  "/",
  requireRole(...ROLE_GROUPS.documentRead),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);

    const documents = await listDocuments(schoolId, req.user!, {
      studentId: req.query.studentId as string | undefined,
      status: req.query.status as DocumentStatus | undefined,
    });
    res.json({ documents });
  }),
);

documentRouter.get(
  "/:documentId",
  requireRole(...ROLE_GROUPS.documentRead),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);
    const document = await getDocument(req.user!, req.params.documentId, schoolId);
    res.json({ document });
  }),
);

/**
 * The file itself. Until this existed the pipeline stopped at "stored": a
 * document could be uploaded, categorized and filed, and then never opened
 * again — no viewer, no download, no way to confirm what had been captured.
 *
 * Access goes through getDocument first, so this is scoped exactly like the
 * metadata: a teacher who may not read a document may not read its bytes by
 * asking for a different URL.
 */
documentRouter.get(
  "/:documentId/file",
  requireRole(...ROLE_GROUPS.documentRead),
  asyncHandler(async (req, res) => {
    const schoolId = req.query.schoolId as string;
    requireSameSchool(schoolId, req.user!);

    const document = await getDocument(req.user!, req.params.documentId, schoolId);
    const file = await storageService.read(document.storageKey);
    if (!file) {
      throw AppError.notFound("The stored file for this document is no longer available");
    }

    // `inline` so a viewer can render it in place; the filename is still
    // carried so a download saves under the name it was uploaded with.
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(file.sizeBytes));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalFilename.replace(/["\\]/g, "")}"`,
    );
    res.send(file.bytes);
  }),
);

const confirmSchema = z.object({
  schoolId: z.string().uuid(),
  category: z.string().min(2),
});

documentRouter.post(
  "/:documentId/confirm-category",
  requireRole(...ROLE_GROUPS.documentReview),
  asyncHandler(async (req, res) => {
    const { schoolId, category } = confirmSchema.parse(req.body);
    requireSameSchool(schoolId, req.user!);
    const document = await confirmDocumentCategory(req.params.documentId, schoolId, category, req.user!);
    res.json({ document });
  }),
);
