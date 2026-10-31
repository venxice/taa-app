// ============================================================
// Zod Validation Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';

type Schema = z.ZodTypeAny;

export function validate(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const formatted = result.error.flatten();
      return next(new ApiError(400, 'Validation failed', true, {
        errors: formatted.fieldErrors,
        formErrors: formatted.formErrors,
      }));
    }

    // Apply parsed/coerced values back onto the request so controllers
    // receive the validated data (e.g. coerced dates/numbers).
    const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (data.body !== undefined) req.body = data.body;
    if (data.params !== undefined) req.params = data.params as typeof req.params;
    if (data.query !== undefined) {
      try {
        req.query = data.query as typeof req.query;
      } catch {
        // req.query may be read-only (Express 5) — ignore
      }
    }

    next();
  };
}
