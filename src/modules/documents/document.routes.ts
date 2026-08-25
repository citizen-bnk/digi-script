import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { DocumentStatus, Sensitivity } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireSameSchool, ROLE_GROUPS } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { confirmDocumentCategory, getDocument, ingestDocument, listDocuments } from "./document.service.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest("A file is required (multipart field 'file')");
    }
    const meta = uploadMetaSchema.parse(req.body);
    requireSameSchool(meta.schoolId, req.user!);

    const document = await ingestDocument({
      schoolId: meta.schoolId,
      uploadedByUserId: req.user!.id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
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
    const document = await confirmDocumentCategory(req.params.documentId, schoolId, category, req.user!.id);
    res.json({ document });
  }),
);
