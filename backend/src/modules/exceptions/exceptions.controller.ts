import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/audit.service';
import { z } from 'zod';
import { ExceptionStatus, ExceptionSeverity } from '@prisma/client';

const assignSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'IGNORED']),
  resolution: z.string().optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1),
});

export class ExceptionsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { status, severity, assignedToId, reconciliationId, page = '1', limit = '20', search } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = { organizationId: orgId };

      if (status) whereClause.status = status as ExceptionStatus;
      if (severity) whereClause.severity = severity as ExceptionSeverity;
      if (assignedToId) whereClause.assignedToId = assignedToId === 'unassigned' ? null : (assignedToId as string);
      if (reconciliationId) whereClause.reconciliationId = reconciliationId as string;

      if (search) {
        whereClause.OR = [
          { reason: { contains: search as string, mode: 'insensitive' } },
          { resolution: { contains: search as string, mode: 'insensitive' } },
          { result: { sourceARecord: { externalId: { contains: search as string, mode: 'insensitive' } } } },
          { result: { sourceBRecord: { externalId: { contains: search as string, mode: 'insensitive' } } } },
        ];
      }

      const [exceptions, total] = await Promise.all([
        prisma.exception.findMany({
          where: whereClause,
          include: {
            reconciliation: { select: { id: true, name: true } },
            result: {
              include: {
                sourceARecord: true,
                sourceBRecord: true,
              },
            },
            assignedTo: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            resolvedBy: { select: { id: true, name: true } },
            _count: { select: { comments: true } },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exception.count({ where: whereClause }),
      ]);

      const formatted = exceptions.map((exc: any) => ({
        ...exc,
        result: {
          ...exc.result,
          differenceAmount: exc.result.differenceAmount.toString(),
          sourceARecord: exc.result.sourceARecord
            ? { ...exc.result.sourceARecord, amount: exc.result.sourceARecord.amount.toString() }
            : null,
          sourceBRecord: exc.result.sourceBRecord
            ? { ...exc.result.sourceBRecord, amount: exc.result.sourceBRecord.amount.toString() }
            : null,
        },
      }));

      res.json({
        exceptions: formatted,
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

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const exception = await prisma.exception.findFirst({
        where: { id, organizationId: orgId },
        include: {
          reconciliation: {
            include: {
              sourceA: true,
              sourceB: true,
            },
          },
          result: {
            include: {
              sourceARecord: true,
              sourceBRecord: true,
            },
          },
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true, email: true } },
          comments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!exception) {
        throw new AppError('Exception not found', 404, 'EXCEPTION_NOT_FOUND');
      }

      const formatted = {
        ...exception,
        result: {
          ...exception.result,
          differenceAmount: exception.result.differenceAmount.toString(),
          sourceARecord: exception.result.sourceARecord
            ? { ...exception.result.sourceARecord, amount: exception.result.sourceARecord.amount.toString() }
            : null,
          sourceBRecord: exception.result.sourceBRecord
            ? { ...exception.result.sourceBRecord, amount: exception.result.sourceBRecord.amount.toString() }
            : null,
        },
      };

      res.json({ exception: formatted });
    } catch (err) {
      next(err);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const parsed = assignSchema.parse(req.body);

      const exception = await prisma.exception.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!exception) {
        throw new AppError('Exception not found', 404, 'EXCEPTION_NOT_FOUND');
      }

      if (parsed.assignedToId) {
        const assignee = await prisma.user.findFirst({
          where: { id: parsed.assignedToId, organizationId: orgId },
        });

        if (!assignee) {
          throw new AppError('Assignee user not found in organization', 404, 'USER_NOT_FOUND');
        }
      }

      const updated = await prisma.exception.update({
        where: { id },
        data: {
          assignedToId: parsed.assignedToId,
        },
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'EXCEPTION_ASSIGNED',
        resource: `Exception:${id}`,
        details: { assignedToId: parsed.assignedToId },
      });

      res.json({ exception: updated });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const parsed = updateStatusSchema.parse(req.body);

      const exception = await prisma.exception.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!exception) {
        throw new AppError('Exception not found', 404, 'EXCEPTION_NOT_FOUND');
      }

      const statusEnum = parsed.status as ExceptionStatus;
      const isResolving = statusEnum === ExceptionStatus.RESOLVED;

      if (isResolving && !parsed.resolution) {
        throw new AppError('A resolution reason is required when marking an exception as RESOLVED', 400, 'RESOLUTION_REQUIRED');
      }

      const updated = await prisma.exception.update({
        where: { id },
        data: {
          status: statusEnum,
          resolution: parsed.resolution || exception.resolution,
          resolvedById: isResolving ? req.user!.id : exception.resolvedById,
          resolvedAt: isResolving ? new Date() : exception.resolvedAt,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      });

      const actionName = statusEnum === ExceptionStatus.RESOLVED ? 'EXCEPTION_RESOLVED' : statusEnum === ExceptionStatus.IGNORED ? 'EXCEPTION_IGNORED' : 'EXCEPTION_STATUS_CHANGED';

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: actionName,
        resource: `Exception:${id}`,
        details: { newStatus: statusEnum, resolution: parsed.resolution },
      });

      res.json({ exception: updated });
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const parsed = addCommentSchema.parse(req.body);

      const exception = await prisma.exception.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!exception) {
        throw new AppError('Exception not found', 404, 'EXCEPTION_NOT_FOUND');
      }

      const comment = await prisma.exceptionComment.create({
        data: {
          exceptionId: id,
          userId: req.user!.id,
          content: parsed.content,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  }
}
