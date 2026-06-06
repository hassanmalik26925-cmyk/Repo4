import { db, auditLogsTable } from "@workspace/db";

export const AuditService = {
  async log(opts: {
    userId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }) {
    try {
      await db.insert(auditLogsTable).values({
        userId: opts.userId ?? null,
        action: opts.action,
        resource: opts.resource ?? null,
        resourceId: opts.resourceId ?? null,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
        details: opts.details ? JSON.stringify(opts.details) : null,
      });
    } catch {
      // Audit logging must never break the request
    }
  },
};
