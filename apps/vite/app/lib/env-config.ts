import { z } from "zod";

// Environment schema validation
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
});

// Parse and validate environment variables
function parseEnv() {
  const env = {
    // API Configuration
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  };

  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error("❌ Environment validation failed:", result.error.format());
    throw new Error("Invalid environment configuration");
  }

  return result.data;
}

// Environment configuration object
export const env = parseEnv();
