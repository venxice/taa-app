import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { financeController } from './finance.controller';

const router = Router();
router.use(authenticate, authorize('hoa_officer', 'admin'));
router.get('/', financeController.list);
router.post('/entries', financeController.create);
router.put('/dues-setting', financeController.setDuesSuspended);
export default router;
