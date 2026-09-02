import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/dashboard', AnalyticsController.getDashboardMetrics);
router.get('/charts', AnalyticsController.getChartsData);

export default router;
