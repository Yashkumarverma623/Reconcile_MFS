import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/register', rateLimiter({ windowMs: 60 * 1000, max: 1000, keyPrefix: 'auth-register' }), AuthController.register);
router.post('/login', rateLimiter({ windowMs: 60 * 1000, max: 1000, keyPrefix: 'auth-login' }), AuthController.login);
router.get('/me', authenticateJWT, AuthController.me);

export default router;
