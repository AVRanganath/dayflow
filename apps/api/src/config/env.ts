/**
 * Validated process environment (ADR from plan.md §8). Import `env` everywhere
 * instead of touching `process.env` directly — invalid config fails fast at boot.
 */
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRY: z.string().min(1).default('7d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[dayflow-api] invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

/** Typed, validated environment — safe to import anywhere. */
export const env = parsed.data;
