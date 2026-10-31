import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Require same-origin browser requests for state changes authenticated by cookies. */
export function verifyCookieRequestOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const hasCookieSession = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  if (!hasCookieSession) return next();

  const origin = req.get('origin');
  if (!origin) return next(ApiError.forbidden('Origin header required for cookie-authenticated requests'));

  try {
    if (new URL(origin).origin !== new URL(env.CLIENT_URL).origin) {
      return next(ApiError.forbidden('Cross-origin request rejected'));
    }
  } catch {
    return next(ApiError.forbidden('Invalid request origin'));
  }

  next();
}
