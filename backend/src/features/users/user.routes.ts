// ============================================================
// User Routes (verify users, manage accounts)
// ============================================================
import { Router } from 'express';

import { userController } from './user.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { verifyUserSchema, updateUserSchema, updateOwnProfileSchema, userIdParamSchema } from './user.schema';

const router = Router();

router.use(authenticate);

// Own account details (any signed-in user) — must come before /:id
router.put('/me', validate(updateOwnProfileSchema), userController.updateMe);

// View users: hoa_officer, admin
router.get(
  '/',
  authorize('hoa_officer', 'admin'),
  userController.list
);
router.get(
  '/:id',
  authorize('hoa_officer', 'admin'),
  userController.get
);

// Update basic info (staff) / role+status (admin)
router.put(
  '/:id',
  authorize('hoa_officer', 'admin'),
  validate(updateUserSchema),
  userController.update
);

// Verify/reject/suspend: hoa_officer, admin
router.post(
  '/:id/verify',
  authorize('hoa_officer', 'admin'),
  validate(verifyUserSchema),
  userController.verify
);

// Disable / re-enable accounts: admin only
router.post(
  '/:id/disable',
  authorize('admin'),
  validate(userIdParamSchema),
  userController.disable
);
router.post(
  '/:id/enable',
  authorize('admin'),
  validate(userIdParamSchema),
  userController.enable
);

export default router;
