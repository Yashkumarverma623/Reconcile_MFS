import { Router } from 'express';
import { ExceptionsController } from './exceptions.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', ExceptionsController.list);
router.get('/:id', ExceptionsController.getById);
router.patch('/:id/assign', requireRole([Role.OWNER, Role.MEMBER]), ExceptionsController.assign);
router.patch('/:id/status', requireRole([Role.OWNER, Role.MEMBER]), ExceptionsController.updateStatus);
router.post('/:id/comments', requireRole([Role.OWNER, Role.MEMBER]), ExceptionsController.addComment);

export default router;
