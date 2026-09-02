import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);
router.get('/', requireRole([Role.OWNER, Role.MEMBER]), AuditController.list);

export default router;
