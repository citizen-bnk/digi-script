import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLE_GROUPS } from "../../middleware/rbac.js";
import { queryAuditLog } from "./audit.service.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

// PRD Use Case 4: Compliance Audit. SUPPORT/SUPER_USER/SYSTEM_OWNER only.
auditRouter.get(
  "/",
  requireRole(...ROLE_GROUPS.auditAccess),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { action, targetType, from, to } = req.query;

    // Non-system-owner roles are always scoped to their own school; they
    // cannot widen the query by passing a different schoolId.
    const schoolId =
      user.role === "SYSTEM_OWNER" ? (req.query.schoolId as string | undefined) : user.schoolId ?? undefined;
    const districtId = user.role === "SYSTEM_OWNER" ? user.districtId ?? undefined : undefined;

    if (user.role !== "SYSTEM_OWNER" && !schoolId) {
      throw AppError.forbidden("User is not associated with a school");
    }

    const entries = await queryAuditLog({
      schoolId,
      districtId,
      action: typeof action === "string" ? action : undefined,
      targetType: typeof targetType === "string" ? targetType : undefined,
      from: typeof from === "string" ? new Date(from) : undefined,
      to: typeof to === "string" ? new Date(to) : undefined,
    });

    res.json({ entries });
  }),
);
