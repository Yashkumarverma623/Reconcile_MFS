import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const query = (req.query.q as string) || '';

      if (!query || query.trim().length < 2) {
        return res.json({ reconciliations: [], sourceRecords: [], exceptions: [] });
      }

      const q = query.trim();

      const [reconciliations, sourceRecords, exceptions] = await Promise.all([
        prisma.reconciliation.findMany({
          where: {
            organizationId: orgId,
            name: { contains: q, mode: 'insensitive' },
          },
          take: 5,
          select: { id: true, name: true, status: true, createdAt: true },
        }),
        prisma.sourceRecord.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { externalId: { contains: q, mode: 'insensitive' } },
              { customerReference: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 10,
          select: { id: true, externalId: true, amount: true, date: true, customerReference: true, status: true },
        }),
        prisma.exception.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { reason: { contains: q, mode: 'insensitive' } },
              { resolution: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, severity: true, status: true, reason: true, createdAt: true },
        }),
      ]);

      const formattedRecords = sourceRecords.map((r: any) => ({
        ...r,
        amount: r.amount.toString(),
      }));

      res.json({
        reconciliations,
        sourceRecords: formattedRecords,
        exceptions,
      });
    } catch (err) {
      next(err);
    }
  }
}
