import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { StorageService } from '../../services/storage.service';
import { importQueue } from '../../config/redis';
import { AuditService } from '../../services/audit.service';
import { JobStatus } from '@prisma/client';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const fileUploadMiddleware = upload.single('file');

export class ImportsController {
  static async createUploadImport(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { dataSourceId } = req.body;

      if (!dataSourceId) {
        throw new AppError('dataSourceId is required', 400, 'MISSING_DATA_SOURCE');
      }

      const dataSource = await prisma.dataSource.findFirst({
        where: { id: dataSourceId, organizationId: orgId },
      });

      if (!dataSource) {
        throw new AppError('Data source not found', 404, 'DATA_SOURCE_NOT_FOUND');
      }

      let filePath: string | null = null;
      let checksum: string;

      if (dataSource.type === 'API') {
        // For API sources, generate checksum based on date + data source id
        checksum = StorageService.calculateChecksum(Buffer.from(`api-${dataSourceId}-${new Date().toISOString().substring(0, 10)}`));
      } else {
        if (!req.file) {
          throw new AppError('No file attached', 400, 'NO_FILE');
        }
        const saved = StorageService.saveBuffer(req.file.buffer, req.file.originalname);
        filePath = saved.filePath;
        checksum = saved.checksum;
      }

      // Check idempotency: check if identical import already processed for this org
      const existingImport = await prisma.import.findUnique({
        where: {
          organizationId_checksum: {
            organizationId: orgId,
            checksum,
          },
        },
      });

      if (existingImport) {
        return res.status(200).json({
          message: 'An import with identical data checksum already exists',
          import: existingImport,
          isDuplicate: true,
        });
      }

      const importRecord = await prisma.import.create({
        data: {
          organizationId: orgId,
          dataSourceId: dataSource.id,
          checksum,
          status: JobStatus.QUEUED,
          filePath,
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user?.id,
        action: 'IMPORT_STARTED',
        resource: `Import:${importRecord.id}`,
        details: { dataSourceId: dataSource.id, type: dataSource.type },
      });

      // Enqueue job to BullMQ
      await importQueue.add(
        'process-import',
        {
          importId: importRecord.id,
          organizationId: orgId,
          dataSourceId: dataSource.id,
          filePath,
          dataSourceType: dataSource.type,
          config: dataSource.config,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      res.status(202).json({
        message: 'Import job queued successfully',
        import: importRecord,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getImportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const importRecord = await prisma.import.findFirst({
        where: { id, organizationId: orgId },
        include: { dataSource: true },
      });

      if (!importRecord) {
        throw new AppError('Import job not found', 404, 'IMPORT_NOT_FOUND');
      }

      res.json({ import: importRecord });
    } catch (err) {
      next(err);
    }
  }

  static async listImports(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const imports = await prisma.import.findMany({
        where: { organizationId: orgId },
        include: { dataSource: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ imports });
    } catch (err) {
      next(err);
    }
  }
}
