import { Context, Next } from "hono";
import { type CloudflareBindings } from "../lib/env";
import { type ErrorResponse } from "shared-types";

// Simple in-memory rate limiter for development
// In production, you should use Redis or Cloudflare KV
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Lazy cleanup function - called during rate limit checks
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (c: Context) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Whether to skip counting successful requests
  message?: string; // Custom error message
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => getClientIdentifier(c),
    skipSuccessfulRequests = false,
    message = "Too many requests from this IP, please try again later",
  } = options;

  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    // Cleanup expired entries occasionally (1% chance)
    if (Math.random() < 0.01) {
      cleanupExpiredEntries();
    }

    const key = keyGenerator(c);
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Rate limit exceeded",
        errors: [
          {
            field: "rate_limit",
            message,
            code: "RATE_LIMIT_EXCEEDED",
          },
        ],
        timestamp: new Date().toISOString(),
      };

      // Add rate limit headers
      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header(
        "X-RateLimit-Reset",
        Math.ceil(entry.resetTime / 1000).toString()
      );
      c.header(
        "Retry-After",
        Math.ceil((entry.resetTime - now) / 1000).toString()
      );

      return c.json(errorResponse, 429);
    }

    // Store original response to check status later
    let statusCode = 200;
    const originalRes = c.res;

    await next();

    // Get status code from response
    if (c.res.status) {
      statusCode = c.res.status;
    }

    // Increment counter only if we should count this request
    if (!skipSuccessfulRequests || statusCode >= 400) {
      entry.count++;
      rateLimitStore.set(key, entry);
    }

    // Add rate limit headers to successful responses
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - entry.count).toString()
    );
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(c: Context): string {
  // Try to get real IP from Cloudflare headers
  const cfConnectingIp = c.req.header("CF-Connecting-IP");
  if (cfConnectingIp) {
    return `ip:${cfConnectingIp}`;
  }

  // Fallback to X-Forwarded-For
  const xForwardedFor = c.req.header("X-Forwarded-For");
  if (xForwardedFor) {
    // Take the first IP from the list
    const ip = xForwardedFor.split(",")[0].trim();
    return `ip:${ip}`;
  }

  // Fallback to remote address (not reliable in serverless)
  return `ip:unknown`;
}

/**
 * Predefined rate limiters for common use cases
 */

// Strict rate limiter for user registration (5 registrations per hour per IP)
export const userRegistrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  skipSuccessfulRequests: false,
  message:
    "Too many user registrations from this IP. Please try again after 1 hour.",
});

// General API rate limiter (100 requests per 15 minutes)
export const generalApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: true, // Only count failed requests
  message: "Too many API requests from this IP. Please try again later.",
});

// Login rate limiter (10 attempts per 15 minutes)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  skipSuccessfulRequests: true, // Only count failed login attempts
  message:
    "Too many login attempts from this IP. Please try again after 15 minutes.",
});

// Strict rate limiter for password changes (3 changes per hour)
export const passwordChangeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  skipSuccessfulRequests: false,
  message: "Too many password change attempts. Please try again after 1 hour.",
});
