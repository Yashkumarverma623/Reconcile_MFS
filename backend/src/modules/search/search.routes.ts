import { Router } from 'express';
import { SearchController } from './search.controller';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.get('/', SearchController.search);

export default router;
