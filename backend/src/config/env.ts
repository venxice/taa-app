// ============================================================
// Environment Config Loader
// ============================================================
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),
});

const parsed = envSchema.refine(
  (value) => value.JWT_SECRET !== value.JWT_REFRESH_SECRET,
  { message: 'JWT_SECRET and JWT_REFRESH_SECRET must be different', path: ['JWT_REFRESH_SECRET'] }
).safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
