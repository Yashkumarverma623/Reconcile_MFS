import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/audit.service';
import { z } from 'zod';
import { DataSourceType, DataSourceStatus } from '@prisma/client';

const createDataSourceSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['CSV', 'JSON', 'API']),
  config: z.record(z.any()).optional(),
});

const updateDataSourceSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  config: z.record(z.any()).optional(),
});

export class DataSourcesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const dataSources = await prisma.dataSource.findMany({
        where: { organizationId: orgId },
        include: {
          imports: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, totalRows: true, completedAt: true, createdAt: true },
          },
          _count: { select: { imports: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ dataSources });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const parsed = createDataSourceSchema.parse(req.body);

      const dataSource = await prisma.dataSource.create({
        data: {
          organizationId: orgId,
          name: parsed.name,
          type: parsed.type as DataSourceType,
          config: parsed.config || {},
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'DATA_SOURCE_CREATED',
        resource: `DataSource:${dataSource.id}`,
        details: { name: dataSource.name, type: dataSource.type },
      });

      res.status(201).json({ dataSource });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const parsed = updateDataSourceSchema.parse(req.body);

      const existing = await prisma.dataSource.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!existing) {
        throw new AppError('Data source not found', 404, 'DATA_SOURCE_NOT_FOUND');
      }

      const dataSource = await prisma.dataSource.update({
        where: { id },
        data: {
          ...(parsed.name && { name: parsed.name }),
          ...(parsed.status && { status: parsed.status as DataSourceStatus }),
          ...(parsed.config && { config: parsed.config }),
        },
      });

      res.json({ dataSource });
    } catch (err) {
      next(err);
    }
  }

  static async getImportHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const dataSource = await prisma.dataSource.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!dataSource) {
        throw new AppError('Data source not found', 404, 'DATA_SOURCE_NOT_FOUND');
      }

      const imports = await prisma.import.findMany({
        where: { dataSourceId: id, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ imports });
    } catch (err) {
      next(err);
    }
  }
}
