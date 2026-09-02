import { prisma } from '../config/prisma';

export class AuditService {
  static async log(params: {
    organizationId: string;
    userId?: string;
    action: string;
    resource: string;
    details?: Record<string, any>;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          details: params.details || {},
        },
      });
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }
}
