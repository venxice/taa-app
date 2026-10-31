// ============================================================
// Announcement Validation Schemas
// ============================================================
import { z } from 'zod';

const announcementImageUrl = z.string().max(500).refine(
  (url) =>
    url.startsWith('/uploads/') ||
    /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url),
  'Image URL is invalid'
).nullish();

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required').max(10000),
    isPublished: z.boolean().optional().default(false),
    imageUrl: announcementImageUrl,
  }),
});

export const updateAnnouncementSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
    isPublished: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    imageUrl: announcementImageUrl,
  }),
});
