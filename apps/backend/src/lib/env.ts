import { z } from "zod";

// Schema untuk environment variables
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "Database URL is required").optional(),
  JWT_SECRET: z.string().min(1, "JWT secret is required").optional(),
  FRONTEND_URL: z.string().url("Invalid frontend URL").optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Cloudflare Workers Environment Bindings
export interface CloudflareBindings {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  FRONTEND_URL?: string;
  NODE_ENV?: string;
  CORS_ORIGIN?: string;
}

// Function untuk validate environment variables
export function validateEnv(env: CloudflareBindings): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    console.error("Environment validation failed:", error);
    throw new Error("Invalid environment configuration");
  }
}

// Helper function untuk get environment with defaults for development
export function getEnv(c: any): Env {
  const env = validateEnv(c.env || {});

  // Provide development defaults if running in development
  if (env.NODE_ENV === "development" || !env.NODE_ENV) {
    return {
      DATABASE_URL: env.DATABASE_URL || "",
      JWT_SECRET: env.JWT_SECRET || "dev-secret-key",
      FRONTEND_URL: env.FRONTEND_URL || "http://localhost:3000",
      NODE_ENV: env.NODE_ENV || "development",
      CORS_ORIGIN: env.CORS_ORIGIN,
    };
  }

  return env;
}
