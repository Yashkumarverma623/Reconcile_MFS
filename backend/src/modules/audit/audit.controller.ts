import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { page = '1', limit = '25' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 25;
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { organizationId: orgId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where: { organizationId: orgId } }),
      ]);

      res.json({
        auditLogs: logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
