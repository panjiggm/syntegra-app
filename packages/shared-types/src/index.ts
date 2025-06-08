import { z } from "zod";

// ==================== GLOBAL ERROR SCHEMAS ====================

// Generic error detail schema
export const ErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

// Generic error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(ErrorDetailSchema).optional(),
  timestamp: z.string().datetime(),
});

// Success response schema (for operations without data)
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
});

// Generic paginated response metadata
export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
  has_next_page: z.boolean(),
  has_prev_page: z.boolean(),
});

// ==================== GLOBAL TYPES ====================
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// ==================== MODULE EXPORTS ====================

// Export all user-related types and schemas
export * from "./user";

// Export all user-bulk related types and schemas
export * from "./user-bulk";

// Export all auth-related types and schemas
export * from "./auth";

// Export all test-related types and schemas
export * from "./test";

// Export all test-attempts related types and schemas
export * from "./test-attempts";

// Export all question-related types and schemas
export * from "./question";

// Export all session-related types and schemas
export * from "./session";

// Export all session-participants related types and schemas
export * from "./session-participants";

// Export all answer-related types and schemas
export * from "./answer";

// Export all test-result-related types and schemas
export * from "./test-result";

// Export all dashboard-related types and schemas
export * from "./dashboard";

// Export all analytics-related types and schemas
export * from "./analytics";

// Export all report-related types and schemas
export * from "./report";

// Export all user-detail-related types and schemas
export * from "./user-detail";

// Re-export zod for convenience
export { z } from "zod";
