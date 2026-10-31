// ============================================================
// File Upload Config - multer storage for announcement images
// ============================================================
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { del, put } from '@vercel/blob';
import { env } from './env';

/** All announcement photos are cropped to this size so the feed stays uniform. */
export const ANNOUNCEMENT_IMAGE_WIDTH = 1200;
export const ANNOUNCEMENT_IMAGE_HEIGHT = 675;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_TYPES = new Set(Object.keys(MIME_EXT));

export const announcementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

/**
 * Crop/compress an uploaded image to the standard announcement size
 * (16:9, JPEG), then store it durably in Vercel Blob.
 */
export async function normalizeAnnouncementImage(file: Express.Multer.File) {
  const image = await sharp(file.buffer)
    .rotate()
    .resize(ANNOUNCEMENT_IMAGE_WIDTH, ANNOUNCEMENT_IMAGE_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const blob = await put(
    `announcements/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`,
    image,
    { access: 'public', contentType: 'image/jpeg' }
  );
  return blob.url;
}

/** Best-effort removal of an announcement image owned by this Blob store. */
export async function deleteUploadFile(url?: string | null) {
  if (!url) return;
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith('.public.blob.vercel-storage.com')) await del(url);
  } catch {
    // Ignore legacy local paths and malformed URLs.
  }
}
