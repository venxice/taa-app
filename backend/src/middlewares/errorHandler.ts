// ============================================================
// Central Error Handler
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : 'Internal Server Error';

  const body: Record<string, unknown> = {
    success: false,
    message,
  };

  if (err instanceof ApiError && err.details) Object.assign(body, err.details);

  if (env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  if (statusCode >= 500) console.error(`❌ [${statusCode}]`, err);
  else console.warn(`⚠️ [${statusCode}] ${message}`);
  return res.status(statusCode).json(body);
}
