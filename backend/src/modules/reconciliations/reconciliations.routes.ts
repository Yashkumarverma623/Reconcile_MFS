import { Router } from 'express';
import { ReconciliationsController } from './reconciliations.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  requireRole([Role.OWNER, Role.MEMBER]),
  rateLimiter({ windowMs: 60 * 1000, max: 10, keyPrefix: 'reconciliations-create' }),
  ReconciliationsController.create
);

router.get('/', ReconciliationsController.list);
router.get('/matching-rules', ReconciliationsController.listMatchingRules);
router.post('/matching-rules', requireRole([Role.OWNER, Role.MEMBER]), ReconciliationsController.createMatchingRule);
router.get('/:id', ReconciliationsController.getById);
router.get('/:id/results', ReconciliationsController.getResults);

export default router;
