// ============================================================
// Announcement Routes
// ============================================================
import { Router } from 'express';

import { announcementController } from './announcement.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { uploadAnnouncementImage } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from './announcement.schema';

const router = Router();

router.use(authenticate);

// View: all authenticated users (residents only see published)
router.get('/', announcementController.list);
router.get('/:id', announcementController.get);

// Create/update: hoa_officer, admin
router.post(
  '/',
  authorize('hoa_officer', 'admin'),
  validate(createAnnouncementSchema),
  announcementController.create
);
// Image upload: hoa_officer, admin (multipart, field "image")
router.post(
  '/upload',
  authorize('hoa_officer', 'admin'),
  uploadAnnouncementImage,
  announcementController.uploadImage
);
router.put(
  '/:id',
  authorize('hoa_officer', 'admin'),
  validate(updateAnnouncementSchema),
  announcementController.update
);

// Delete: admin only
router.delete('/:id', authorize('admin'), announcementController.remove);

export default router;
