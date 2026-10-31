// ============================================================
// Resident Routes
// ============================================================
import { Router } from 'express';

import { residentController } from './resident.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { updateResidentSchema } from './resident.schema';

const router = Router();

router.use(authenticate);

// Own profile (any authenticated user)
router.get('/me', residentController.me);
router.put('/me', validate(updateResidentSchema), residentController.updateMe);

// All residents: staff only
router.get('/', authorize('hoa_officer', 'admin'), residentController.list);
router.get('/:id', residentController.get);
router.put(
  '/:id',
  authorize('hoa_officer', 'admin'),
  validate(updateResidentSchema),
  residentController.update
);
router.delete('/:id', authorize('admin'), residentController.remove);

export default router;
