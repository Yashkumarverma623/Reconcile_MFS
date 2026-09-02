import { Router } from 'express';
import { OrganizationsController } from './organizations.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/members', OrganizationsController.getMembers);
router.post('/members', requireRole([Role.OWNER]), OrganizationsController.addMember);

export default router;
