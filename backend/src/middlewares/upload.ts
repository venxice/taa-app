// ============================================================
// Upload Middlewares - multer wrappers with clean 400 errors
// ============================================================
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { announcementUpload } from '../config/upload';
import { ApiError } from '../utils/ApiError';

/** multer.single('image') with errors translated to 400 responses. */
export function uploadAnnouncementImage(req: Request, res: Response, next: NextFunction) {
  announcementUpload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Image is too large (max 5 MB)'
          : err.message || 'Upload failed';
      return next(ApiError.badRequest(message));
    }
    if (!req.file) return next(ApiError.badRequest('Image file is required'));
    next();
  });
}
