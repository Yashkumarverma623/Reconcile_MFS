import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { JobStatus, ExceptionStatus, ExceptionSeverity, ResultType } from '@prisma/client';

export class AnalyticsController {
  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;

      const [
        totalReconciliations,
        completedReconciliations,
        runningReconciliations,
        failedReconciliations,
        openExceptions,
        inReviewExceptions,
        resolvedExceptions,
        ignoredExceptions,
        highSeverityExceptions,
        mediumSeverityExceptions,
        lowSeverityExceptions,
        reconciliationAggregates,
        importAggregates,
      ] = await Promise.all([
        prisma.reconciliation.count({ where: { organizationId: orgId } }),
        prisma.reconciliation.count({ where: { organizationId: orgId, status: JobStatus.COMPLETED } }),
        prisma.reconciliation.count({ where: { organizationId: orgId, status: { in: [JobStatus.RUNNING, JobStatus.QUEUED] } } }),
        prisma.reconciliation.count({ where: { organizationId: orgId, status: JobStatus.FAILED } }),
        prisma.exception.count({ where: { organizationId: orgId, status: ExceptionStatus.OPEN } }),
        prisma.exception.count({ where: { organizationId: orgId, status: ExceptionStatus.IN_REVIEW } }),
        prisma.exception.count({ where: { organizationId: orgId, status: ExceptionStatus.RESOLVED } }),
        prisma.exception.count({ where: { organizationId: orgId, status: ExceptionStatus.IGNORED } }),
        prisma.exception.count({ where: { organizationId: orgId, severity: ExceptionSeverity.HIGH } }),
        prisma.exception.count({ where: { organizationId: orgId, severity: ExceptionSeverity.MEDIUM } }),
        prisma.exception.count({ where: { organizationId: orgId, severity: ExceptionSeverity.LOW } }),
        prisma.reconciliation.aggregate({
          where: { organizationId: orgId, status: JobStatus.COMPLETED },
          _sum: {
            totalSourceA: true,
            totalSourceB: true,
            matchedCount: true,
            mismatchCount: true,
            missingACount: true,
            missingBCount: true,
          },
        }),
        prisma.import.aggregate({
          where: { organizationId: orgId, status: JobStatus.COMPLETED },
          _sum: {
            totalRows: true,
            validRows: true,
            invalidRows: true,
            duplicateRows: true,
          },
        }),
      ]);

      const sumA = reconciliationAggregates._sum.totalSourceA || 0;
      const sumB = reconciliationAggregates._sum.totalSourceB || 0;
      const totalProcessedRecords = sumA + sumB;
      const matched = reconciliationAggregates._sum.matchedCount || 0;
      const mismatches = reconciliationAggregates._sum.mismatchCount || 0;
      const missingA = reconciliationAggregates._sum.missingACount || 0;
      const missingB = reconciliationAggregates._sum.missingBCount || 0;

      const totalEvaluatedPairs = matched + mismatches + missingA + missingB;

      const matchRate = totalEvaluatedPairs > 0 ? Number(((matched / totalEvaluatedPairs) * 100).toFixed(2)) : 0;
      const mismatchRate = totalEvaluatedPairs > 0 ? Number(((mismatches / totalEvaluatedPairs) * 100).toFixed(2)) : 0;
      const missingRate = totalEvaluatedPairs > 0 ? Number((((missingA + missingB) / totalEvaluatedPairs) * 100).toFixed(2)) : 0;

      const totalImportRows = importAggregates._sum.totalRows || 0;
      const duplicateRows = importAggregates._sum.duplicateRows || 0;
      const invalidRows = importAggregates._sum.invalidRows || 0;

      const duplicateRate = totalImportRows > 0 ? Number(((duplicateRows / totalImportRows) * 100).toFixed(2)) : 0;
      const invalidRate = totalImportRows > 0 ? Number(((invalidRows / totalImportRows) * 100).toFixed(2)) : 0;

      const resolvedList = await prisma.exception.findMany({
        where: {
          organizationId: orgId,
          status: ExceptionStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: { createdAt: true, resolvedAt: true },
      });

      let avgResolutionHours = 0;
      if (resolvedList.length > 0) {
        const totalDurationMs = resolvedList.reduce((acc: number, curr: { resolvedAt: Date | null; createdAt: Date }) => {
          return acc + (curr.resolvedAt!.getTime() - curr.createdAt.getTime());
        }, 0);
        avgResolutionHours = Number((totalDurationMs / (1000 * 60 * 60 * resolvedList.length)).toFixed(2));
      }

      res.json({
        reconciliations: {
          total: totalReconciliations,
          completed: completedReconciliations,
          running: runningReconciliations,
          failed: failedReconciliations,
        },
        records: {
          totalProcessedRecords,
          matched,
          mismatches,
          missingA,
          missingB,
          matchRate,
          mismatchRate,
          missingRate,
          duplicateRows,
          duplicateRate,
          invalidRows,
          invalidRate,
        },
        exceptions: {
          open: openExceptions,
          inReview: inReviewExceptions,
          resolved: resolvedExceptions,
          ignored: ignoredExceptions,
          severity: {
            high: highSeverityExceptions,
            medium: mediumSeverityExceptions,
            low: lowSeverityExceptions,
          },
          avgResolutionHours,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getChartsData(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;

      const reconciliations = await prisma.reconciliation.findMany({
        where: { organizationId: orgId, status: JobStatus.COMPLETED },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          id: true,
          name: true,
          matchedCount: true,
          mismatchCount: true,
          missingACount: true,
          missingBCount: true,
          createdAt: true,
        },
      });

      const trendData = reconciliations.map((r: { name: string; matchedCount: number; mismatchCount: number; missingACount: number; missingBCount: number; createdAt: Date }) => ({
        name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
        matched: r.matchedCount,
        mismatch: r.mismatchCount,
        missing: r.missingACount + r.missingBCount,
        date: r.createdAt.toISOString().substring(0, 10),
      }));

      res.json({ trendData });
    } catch (err) {
      next(err);
    }
  }
}
