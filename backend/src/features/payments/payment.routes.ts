// ============================================================
// Payment Routes
// ============================================================
import { Router } from 'express';

import { paymentController } from './payment.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createPaymentSchema,
  updatePaymentSchema,
  confirmPaymentSchema,
} from './payment.schema';

const router = Router();

router.use(authenticate);

// View: residents see own; staff see all
router.get('/report', authorize('hoa_officer', 'admin'), paymentController.report);
router.get('/', paymentController.list);
router.get('/:id', paymentController.get);

// Create dues record: hoa_officer, admin
router.post(
  '/',
  authorize('hoa_officer', 'admin'),
  validate(createPaymentSchema),
  paymentController.create
);

// Update (submit proof / staff edits): all authenticated
router.put('/:id', validate(updatePaymentSchema), paymentController.update);

// Confirm/reject: hoa_officer, admin
router.post(
  '/:id/confirm',
  authorize('hoa_officer', 'admin'),
  validate(confirmPaymentSchema),
  paymentController.confirm
);

// Delete: admin only
router.delete('/:id', authorize('admin'), paymentController.remove);

export default router;
