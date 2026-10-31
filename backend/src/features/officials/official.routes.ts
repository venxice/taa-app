// ============================================================
// Official Routes
// ============================================================
import { Router } from 'express';

import { officialController } from './official.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createOfficialSchema,
  updateOfficialSchema,
} from './official.schema';

const router = Router();

router.use(authenticate);

// View: all authenticated users
router.get('/', officialController.list);
router.get('/:id', officialController.get);

// Manage: hoa_officer, admin
router.post(
  '/',
  authorize('hoa_officer', 'admin'),
  validate(createOfficialSchema),
  officialController.create
);
router.put(
  '/:id',
  authorize('hoa_officer', 'admin'),
  validate(updateOfficialSchema),
  officialController.update
);

// Delete: admin only
router.delete('/:id', authorize('admin'), officialController.remove);

export default router;
