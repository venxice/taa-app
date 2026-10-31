// ============================================================
// Dashboard Routes (role-based stats)
// ============================================================
import { Router } from 'express';

import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', dashboardController.stats);
router.get('/stats', dashboardController.stats);

export default router;
