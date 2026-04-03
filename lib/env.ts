try {
  process.loadEnvFile?.(".env");
} catch {
  // Ignore missing .env in environments where variables are injected externally.
}

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().min(1).default("http://localhost:3000"),
  NEXT_PUBLIC_CDN_BASE_URL: z.string().min(1).optional(),
  S3_ENDPOINT: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_SECRET_KEY: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional()
});

function optionalEnv(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: optionalEnv(process.env.DATABASE_URL),
  NEXT_PUBLIC_SITE_URL: optionalEnv(process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_CDN_BASE_URL: optionalEnv(process.env.NEXT_PUBLIC_CDN_BASE_URL),
  S3_ENDPOINT: optionalEnv(process.env.S3_ENDPOINT),
  S3_REGION: optionalEnv(process.env.S3_REGION),
  S3_BUCKET: optionalEnv(process.env.S3_BUCKET),
  S3_ACCESS_KEY: optionalEnv(process.env.S3_ACCESS_KEY),
  S3_SECRET_KEY: optionalEnv(process.env.S3_SECRET_KEY),
  TURNSTILE_SECRET_KEY: optionalEnv(process.env.TURNSTILE_SECRET_KEY),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalEnv(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
});

export const hasDatabase = Boolean(env.DATABASE_URL);
export const isProduction = env.NODE_ENV === "production";

export function getSiteUrl() {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}
