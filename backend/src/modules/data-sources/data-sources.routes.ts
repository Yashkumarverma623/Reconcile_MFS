import { Router } from 'express';
import { DataSourcesController } from './data-sources.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', DataSourcesController.list);
router.post('/', requireRole([Role.OWNER, Role.MEMBER]), DataSourcesController.create);
router.patch('/:id', requireRole([Role.OWNER, Role.MEMBER]), DataSourcesController.update);
router.get('/:id/imports', DataSourcesController.getImportHistory);

export default router;
