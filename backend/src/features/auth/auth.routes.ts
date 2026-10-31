// ============================================================
// Auth Routes
// ============================================================
import { Router } from 'express';

import * as auth from './auth.controller';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { authLimiter, registerLimiter } from '../../middlewares/rateLimiter';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', authenticate, auth.me);
router.put(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordSchema),
  auth.changePassword
);

export default router;
