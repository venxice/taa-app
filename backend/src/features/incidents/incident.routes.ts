// ============================================================
// Incident Routes
// ============================================================
import { Router } from 'express';

import { incidentController } from './incident.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createIncidentSchema,
  updateIncidentStatusSchema,
} from './incident.schema';

const router = Router();

router.use(authenticate);

// View: residents see own reports; staff see all
router.get('/', incidentController.list);
router.get('/:id', incidentController.get);

// Report an incident: any authenticated user
router.post(
  '/',
  authorize('resident', 'hoa_officer', 'admin'),
  validate(createIncidentSchema),
  incidentController.create
);

// Update status/remarks: hoa_officer, admin
router.put(
  '/:id',
  authorize('hoa_officer', 'admin'),
  validate(updateIncidentStatusSchema),
  incidentController.update
);

// Delete: admin only
router.delete('/:id', authorize('admin'), incidentController.remove);

export default router;
