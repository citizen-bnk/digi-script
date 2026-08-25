import { prisma } from "../../db/prisma.js";

export interface RecordAuditEntryInput {
  actorUserId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Append-only audit trail writer (PRD 4.10). Never update or delete rows
 * written through this service — the audit_logs table is the system's
 * compliance record.
 */
export async function recordAuditEntry(input: RecordAuditEntryInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      districtId: input.districtId ?? null,
      schoolId: input.schoolId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata as never,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export interface AuditQuery {
  schoolId?: string;
  districtId?: string;
  actorUserId?: string;
  action?: string;
  targetType?: string;
  from?: Date;
  to?: Date;
}

export async function queryAuditLog(query: AuditQuery) {
  return prisma.auditLog.findMany({
    where: {
      schoolId: query.schoolId,
      districtId: query.districtId,
      actorUserId: query.actorUserId,
      action: query.action,
      targetType: query.targetType,
      createdAt: {
        gte: query.from,
        lte: query.to,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
