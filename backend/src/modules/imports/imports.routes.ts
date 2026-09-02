import { Router } from 'express';
import { ImportsController, fileUploadMiddleware } from './imports.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  requireRole([Role.OWNER, Role.MEMBER]),
  rateLimiter({ windowMs: 60 * 1000, max: 20, keyPrefix: 'imports-upload' }),
  fileUploadMiddleware,
  ImportsController.createUploadImport
);

router.get('/', ImportsController.listImports);
router.get('/:id', ImportsController.getImportStatus);

export default router;
