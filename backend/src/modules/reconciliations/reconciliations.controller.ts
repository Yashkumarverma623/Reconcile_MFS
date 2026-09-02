import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { reconciliationQueue } from '../../config/redis';
import { AuditService } from '../../services/audit.service';
import { z } from 'zod';
import { JobStatus, ResultType } from '@prisma/client';

const createReconciliationSchema = z.object({
  name: z.string().min(2),
  sourceAId: z.string().uuid(),
  sourceBId: z.string().uuid(),
  matchingRuleId: z.string().uuid().optional(),
});

const createMatchingRuleSchema = z.object({
  name: z.string().min(2),
  primaryKey: z.string().default('external_id'),
  requireAmountMatch: z.boolean().default(true),
  dateToleranceSeconds: z.number().default(86400),
  requireCustomerMatch: z.boolean().default(false),
});

export class ReconciliationsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const parsed = createReconciliationSchema.parse(req.body);

      const [sourceA, sourceB] = await Promise.all([
        prisma.dataSource.findFirst({ where: { id: parsed.sourceAId, organizationId: orgId } }),
        prisma.dataSource.findFirst({ where: { id: parsed.sourceBId, organizationId: orgId } }),
      ]);

      if (!sourceA || !sourceB) {
        throw new AppError('One or both data sources were not found', 404, 'DATA_SOURCE_NOT_FOUND');
      }

      let ruleId = parsed.matchingRuleId;
      if (!ruleId) {
        let defaultRule = await prisma.matchingRule.findFirst({
          where: { organizationId: orgId },
        });

        if (!defaultRule) {
          defaultRule = await prisma.matchingRule.create({
            data: {
              organizationId: orgId,
              name: 'Default ID + Amount Matching Rule',
              primaryKey: 'external_id',
              requireAmountMatch: true,
              dateToleranceSeconds: 86400,
            },
          });
        }
        ruleId = defaultRule.id;
      }

      const reconciliation = await prisma.reconciliation.create({
        data: {
          organizationId: orgId,
          name: parsed.name,
          sourceAId: sourceA.id,
          sourceBId: sourceB.id,
          matchingRuleId: ruleId,
          createdById: req.user!.id,
          status: JobStatus.QUEUED,
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'RECONCILIATION_CREATED',
        resource: `Reconciliation:${reconciliation.id}`,
        details: { name: reconciliation.name, sourceAId: sourceA.id, sourceBId: sourceB.id },
      });

      await reconciliationQueue.add(
        'process-reconciliation',
        {
          reconciliationId: reconciliation.id,
          organizationId: orgId,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      res.status(202).json({
        message: 'Reconciliation job created and queued successfully',
        reconciliation,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const reconciliations = await prisma.reconciliation.findMany({
        where: { organizationId: orgId },
        include: {
          sourceA: { select: { id: true, name: true, type: true } },
          sourceB: { select: { id: true, name: true, type: true } },
          matchingRule: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ reconciliations });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const reconciliation = await prisma.reconciliation.findFirst({
        where: { id, organizationId: orgId },
        include: {
          sourceA: true,
          sourceB: true,
          matchingRule: true,
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { results: true, exceptions: true } },
        },
      });

      if (!reconciliation) {
        throw new AppError('Reconciliation not found', 404, 'RECONCILIATION_NOT_FOUND');
      }

      res.json({ reconciliation });
    } catch (err) {
      next(err);
    }
  }

  static async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { resultType, page = '1', limit = '20', search } = req.query;

      const reconciliation = await prisma.reconciliation.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!reconciliation) {
        throw new AppError('Reconciliation not found', 404, 'RECONCILIATION_NOT_FOUND');
      }

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = { reconciliationId: id };

      if (resultType) {
        whereClause.resultType = resultType as ResultType;
      }

      if (search) {
        whereClause.OR = [
          { sourceARecord: { externalId: { contains: search as string, mode: 'insensitive' } } },
          { sourceBRecord: { externalId: { contains: search as string, mode: 'insensitive' } } },
          { sourceARecord: { customerReference: { contains: search as string, mode: 'insensitive' } } },
          { sourceBRecord: { customerReference: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [results, total] = await Promise.all([
        prisma.reconciliationResult.findMany({
          where: whereClause,
          include: {
            sourceARecord: true,
            sourceBRecord: true,
            exception: {
              select: { id: true, severity: true, status: true, assignedTo: { select: { name: true } } },
            },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.reconciliationResult.count({ where: whereClause }),
      ]);

      const formattedResults = results.map((r: any) => ({
        ...r,
        differenceAmount: r.differenceAmount.toString(),
        sourceARecord: r.sourceARecord
          ? { ...r.sourceARecord, amount: r.sourceARecord.amount.toString() }
          : null,
        sourceBRecord: r.sourceBRecord
          ? { ...r.sourceBRecord, amount: r.sourceBRecord.amount.toString() }
          : null,
      }));

      res.json({
        results: formattedResults,
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

  static async listMatchingRules(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const rules = await prisma.matchingRule.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ matchingRules: rules });
    } catch (err) {
      next(err);
    }
  }

  static async createMatchingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const parsed = createMatchingRuleSchema.parse(req.body);

      const rule = await prisma.matchingRule.create({
        data: {
          organizationId: orgId,
          ...parsed,
        },
      });

      res.status(201).json({ matchingRule: rule });
    } catch (err) {
      next(err);
    }
  }
}
