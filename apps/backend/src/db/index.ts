import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { validateEnv, type CloudflareBindings } from "@/lib/env";

let sql: ReturnType<typeof neon> | null = null;

// Function to create database connection for Cloudflare Workers
export function createDatabase(databaseUrl: string) {
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error(
      "DATABASE_URL is required but not provided. Please configure your database connection string."
    );
  }

  if (!sql) {
    sql = neon(databaseUrl);
  }

  return drizzle(sql, { schema });
}

// For development environments where process.env is available
let db: ReturnType<typeof createDatabase> | null = null;

export function getDb(): ReturnType<typeof createDatabase> {
  // Validate environment variables using env.ts
  const env = validateEnv({
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "",
    NODE_ENV: process.env.NODE_ENV || "development",
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  } as CloudflareBindings);

  if (!db) {
    db = createDatabase(env.DATABASE_URL || "");
  }
  return db;
}

// For Cloudflare Workers - accepts environment from context
export function getDbFromEnv(
  env: CloudflareBindings
): ReturnType<typeof createDatabase> {
  const validatedEnv = validateEnv(env);
  if (!validatedEnv.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc or environment variables."
    );
  }
  return createDatabase(validatedEnv.DATABASE_URL);
}

// Helper function to check if database is configured
export function isDatabaseConfigured(env: CloudflareBindings): boolean {
  try {
    const validatedEnv = validateEnv(env);
    return Boolean(
      validatedEnv.DATABASE_URL && validatedEnv.DATABASE_URL.trim() !== ""
    );
  } catch {
    return false;
  }
}

// Export schema for use in other parts of the application
export * from "./schema";

// Export types for convenience
export type Database = ReturnType<typeof createDatabase>;
