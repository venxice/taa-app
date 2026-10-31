// ============================================================
// Announcement Controller
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { deleteUploadFile, normalizeAnnouncementImage } from '../../config/upload';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type {   createAnnouncementSchema,
  updateAnnouncementSchema,
 } from "./announcement.schema";
import type { z } from "zod";

type CreateInput = z.input<typeof createAnnouncementSchema>['body'];
type UpdateInput = z.input<typeof updateAnnouncementSchema>['body'];

const authorInclude = {
  author: {
    select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
  },
} satisfies Prisma.AnnouncementInclude;

export const announcementController = {
  // GET /api/announcements?search=&published=&page=&limit=
  // Residents only see published; officers/admin see all (unless published=false filter)
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, published, sort, page = '1', limit = '20' } = req.query;
      const role = req.user!.role;
      const dateOrder = sort === 'oldest' ? 'asc' : 'desc';

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

      const where: Prisma.AnnouncementWhereInput = {};

      if (role === 'resident') {
        where.isPublished = true;
      } else if (published === 'true' || published === 'false') {
        where.isPublished = published === 'true';
      }

      if (search) {
        const term = String(search).trim();
        where.OR = [
          { title: { contains: term } },
          { content: { contains: term } },
        ];
      }

      const [total, announcements] = await Promise.all([
        prisma.announcement.count({ where }),
        prisma.announcement.findMany({
          where,
          include: authorInclude,
          orderBy: [{ isPinned: 'desc' }, { createdAt: dateOrder }],
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      sendSuccess(res, {
        announcements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/announcements/:id
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: req.params.id },
        include: authorInclude,
      });
      if (!announcement) throw ApiError.notFound('Announcement not found');

      if (req.user!.role === 'resident' && !announcement.isPublished) {
        throw ApiError.forbidden('Announcement not available');
      }

      sendSuccess(res, { announcement });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/announcements/upload - hoa_officer, admin (multipart, field "image")
  uploadImage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw ApiError.badRequest('Image file is required');
      const url = await normalizeAnnouncementImage(req.file);
      sendSuccess(res, { url }, 'Image uploaded', 201);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/announcements - hoa_officer, admin
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, content, isPublished, imageUrl } = req.body as CreateInput;

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          isPublished: isPublished ?? false,
          imageUrl: imageUrl ?? null,
          authorId: req.user!.userId,
        },
        include: authorInclude,
      });

      sendSuccess(res, { announcement }, 'Announcement created', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/announcements/:id - hoa_officer, admin
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.announcement.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Announcement not found');

      const body = (req.body || {}) as UpdateInput;
      const data: Prisma.AnnouncementUpdateInput = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.content !== undefined) data.content = body.content;
      if (body.isPublished !== undefined) data.isPublished = body.isPublished;
      if (body.isPinned !== undefined) data.isPinned = body.isPinned;
      if (body.imageUrl !== undefined) {
        data.imageUrl = body.imageUrl;
        if (existing.imageUrl && existing.imageUrl !== body.imageUrl) {
          deleteUploadFile(existing.imageUrl);
        }
      }

      const announcement = await prisma.announcement.update({
        where: { id: existing.id },
        data,
        include: authorInclude,
      });

      sendSuccess(res, { announcement }, 'Announcement updated');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/announcements/:id - admin (per PERMISSIONS.deleteAnnouncements)
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.announcement.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Announcement not found');

      await prisma.announcement.delete({ where: { id: existing.id } });
      deleteUploadFile(existing.imageUrl);
      sendSuccess(res, null, 'Announcement deleted');
    } catch (error) {
      next(error);
    }
  },
};
