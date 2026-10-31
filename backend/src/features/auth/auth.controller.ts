// ============================================================
// Auth Controller - Register, Login, Logout, Me
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess, sendError } from '../../utils/response';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import type { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema';
import { env } from '../../config/env';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, {
    ...authCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    ...authCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, middleName, lastName, email, username, password, phone, address, householdRole, householdSize } =
      req.body as RegisterInput;

    // Check duplicate username
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    });

    if (existing) {
      throw ApiError.conflict('Username or email already exists');
    }

    const hashed = await hashPassword(password);

    // Create user with resident profile (new users always start as resident)
    const user = await prisma.user.create({
      data: {
        firstName,
        middleName: middleName || '',
        lastName,
        email: email || null,
        username,
        password: hashed,
        phone: phone || '',
        role: 'resident',
        status: 'pending', // Must be verified by HOA/Admin
        resident: {
          create: {
            email: email || '',
            phone: phone || '',
            address: address || null,
            householdRole: householdRole || '',
            householdSize: householdSize ?? null,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        status: true,
      },
    });

    sendSuccess(
      res,
      {
        user,
        message:
          'Registration successful. Your account is pending verification by the Homeowner’s Association.',
      },
      'Registered successfully. Please wait for verification.',
      201
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(ApiError.conflict('Username or email already exists'));
    }
    next(error);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body as LoginInput;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
      select: {
        id: true,
        username: true,
        password: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        tokenVersion: true,
        avatar: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        resident: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid username or password');
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      throw ApiError.unauthorized('Invalid username or password');
    }

    if (user.status === 'pending') {
      throw ApiError.forbidden(
        'Your account is still pending verification by the Homeowner’s Association.'
      );
    }
    if (user.status === 'rejected') {
      throw ApiError.forbidden(
        user.rejectionReason || 'Your account registration was rejected.'
      );
    }
    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account is suspended. Contact the administrator.');
    }
    if (user.status === 'disabled') {
      throw ApiError.forbidden('Your account has been disabled. Contact the administrator.');
    }

    const payload = { userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    const { password: _pw, tokenVersion: _tokenVersion, ...safeUser } = user;

    sendSuccess(res, { user: safeUser }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw ApiError.unauthorized('No refresh token');

    const payload = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, status: true, tokenVersion: true },
    });

    if (!user || payload.tokenVersion !== user.tokenVersion || user.status !== 'verified') {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    setAccessCookie(res, accessToken);
    sendSuccess(res, null, 'Token refreshed');
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await prisma.user.updateMany({
        where: { id: payload.userId, tokenVersion: payload.tokenVersion },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch {
      // Logout still clears the browser cookie if it is expired or invalid.
    }
  }
  res.clearCookie(ACCESS_COOKIE, authCookieOptions());
  res.clearCookie(REFRESH_COOKIE, authCookieOptions());
  sendSuccess(res, null, 'Logged out');
}

// GET /api/auth/me
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        username: true,
        role: true,
        status: true,
        phone: true,
        avatar: true,
        rejectionReason: true,
        verifiedAt: true,
        resident: true,
        createdAt: true,
      },
    });

    if (!user) throw ApiError.notFound('User not found');

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

// PUT /api/auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw ApiError.notFound('User not found');

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    if (currentPassword === newPassword) {
      throw ApiError.badRequest('New password must be different from your current password');
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}
