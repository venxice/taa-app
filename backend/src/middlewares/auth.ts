// ============================================================
// Authentication & Authorization Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import type { UserRole } from '@prisma/client';
import { assertActiveAccount, assertCurrentSession } from '../features/auth/auth.rules';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

// Require valid JWT
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.cookies?.accessToken;

    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const payload = verifyAccessToken(token);

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, status: true, tokenVersion: true },
    });

    if (!user) throw ApiError.unauthorized('User not found');
    assertCurrentSession(payload.tokenVersion, user.tokenVersion);
    assertActiveAccount(user.status);

    req.user = { userId: user.id, username: user.username, role: user.role };
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

// Require one of the allowed roles
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
