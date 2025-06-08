import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type CloudflareBindings } from "../../lib/env";
import {
  GetTestsRequestSchema,
  GetTestByIdRequestSchema,
  CreateTestRequestSchema,
  UpdateTestRequestSchema,
  UpdateTestByIdRequestSchema,
  DeleteTestByIdRequestSchema,
  type TestErrorResponse,
  UpdateTestDisplayOrderByIdRequestSchema,
  UpdateTestDisplayOrderRequestSchema,
} from "shared-types";
import { getTestsListHandler } from "./test.list";
import { getTestByIdHandler } from "./test.get";
import { getTestStatsHandler } from "./test.stats";
import { createTestHandler } from "./test.create";
import { updateTestHandler } from "./test.update";
import { deleteTestHandler } from "./test.delete";
import { getCategoriesHandler } from "./test.categories";
import { getModuleTypesHandler } from "./test.module-types";
import { getTestPrerequisitesHandler } from "./test.prerequisites";
import { updateTestDisplayOrderHandler } from "./test.display-order";
import { authenticateUser, requireAdmin } from "../../middleware/auth";
import { generalApiRateLimit } from "../../middleware/rateLimiter";
import { questionRoutes } from "./questions";

const testRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== QUESTION ROUTES ====================
// Mount question routes under /:testId/questions
testRoutes.route("/:testId/questions", questionRoutes);

// ==================== CATEGORY & MODULE TYPE ROUTES (Admin only) ====================

// Get All Categories
testRoutes.get(
  "/categories",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  getCategoriesHandler
);

// Get All Module Types
testRoutes.get(
  "/module-types",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  getModuleTypesHandler
);

// ==================== STATISTICS ROUTES (Admin only) ====================

// Get Test Statistics
testRoutes.get(
  "/stats/summary",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  getTestStatsHandler
);

// ==================== UTILITY ROUTES (Admin only) ====================

// Get Test Filter Options (for frontend dropdowns)
testRoutes.get(
  "/filters/options",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      // Import here to avoid circular dependencies
      const {
        TEST_MODULE_TYPE_LABELS,
        TEST_CATEGORY_LABELS,
        TEST_STATUS_LABELS,
      } = await import("shared-types");

      const filterOptions = {
        success: true,
        message: "Filter options retrieved successfully",
        data: {
          module_types: Object.entries(TEST_MODULE_TYPE_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          categories: Object.entries(TEST_CATEGORY_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
          statuses: Object.entries(TEST_STATUS_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            })
          ),
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(filterOptions, 200);
    } catch (error) {
      console.error("Error getting filter options:", error);
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Failed to retrieve filter options",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// Get Category Options by Module Type (for frontend cascading dropdowns)
testRoutes.get(
  "/categories/:moduleType",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  async (c) => {
    try {
      const moduleType = c.req.param("moduleType");

      // Import here to avoid circular dependencies
      const { CATEGORY_MODULE_MAPPING, TEST_CATEGORY_LABELS, ModuleTypeEnum } =
        await import("shared-types");

      // Validate module type
      const validationResult = ModuleTypeEnum.safeParse(moduleType);
      if (!validationResult.success) {
        const errorResponse: TestErrorResponse = {
          success: false,
          message: "Invalid module type",
          errors: [
            {
              field: "moduleType",
              message: "Invalid module type parameter",
              code: "INVALID_MODULE_TYPE",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }

      const categories = CATEGORY_MODULE_MAPPING[validationResult.data];
      const categoryOptions = categories.map((category) => ({
        value: category,
        label: TEST_CATEGORY_LABELS[category],
      }));

      const response = {
        success: true,
        message: `Categories for module type '${moduleType}' retrieved successfully`,
        data: {
          module_type: moduleType,
          categories: categoryOptions,
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("Error getting categories by module type:", error);
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Failed to retrieve categories",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 500);
    }
  }
);

// ==================== ANALYTICS ROUTES (Admin only) ====================

// Get Test Analytics (Future implementation)
testRoutes.get(
  "/:testId/analytics",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetTestByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  async (c) => {
    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Test analytics not implemented yet",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 501);
  }
);

// ==================== BASIC CRUD ROUTES ====================

// Get All Tests Endpoint (ADMIN ONLY)
testRoutes.get(
  "/",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireAdmin, // Second: Verify user is admin (participants will get 403 Forbidden)
  zValidator("query", GetTestsRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid query parameters",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTestsListHandler
);

// Create Test (Admin only)
testRoutes.post(
  "/",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("json", CreateTestRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  createTestHandler
);

// Get Single Test (ADMIN ONLY)
testRoutes.get(
  "/:testId",
  generalApiRateLimit, // General rate limiting
  authenticateUser, // First: Verify user is authenticated
  requireAdmin, // Second: Verify user is admin
  zValidator("param", GetTestByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTestByIdHandler
);

// Get Test Prerequisites (Admin only)
testRoutes.get(
  "/:testId/prerequisites",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", GetTestByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  getTestPrerequisitesHandler
);

// Update Test (Admin only)
testRoutes.put(
  "/:testId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateTestByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  zValidator("json", UpdateTestRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  updateTestHandler
);

// Update Test Display Order (Admin only) - Specific endpoint for display order management
testRoutes.put(
  "/:testId/display-order",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", UpdateTestDisplayOrderByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  zValidator("json", UpdateTestDisplayOrderRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  updateTestDisplayOrderHandler
);

// Delete Test (Admin only)
testRoutes.delete(
  "/:testId",
  generalApiRateLimit,
  authenticateUser,
  requireAdmin,
  zValidator("param", DeleteTestByIdRequestSchema, (result, c) => {
    if (!result.success) {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Invalid test ID parameter",
        errors: result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }
  }),
  deleteTestHandler
);

// ==================== ERROR HANDLERS ====================
testRoutes.onError((err, c) => {
  console.error("Test routes error:", err);

  const errorResponse: TestErrorResponse = {
    success: false,
    message: "Test route error",
    ...(c.env.NODE_ENV === "development" && {
      errors: [
        {
          message: err.message,
          code: "ROUTE_ERROR",
        },
      ],
    }),
    timestamp: new Date().toISOString(),
  };

  return c.json(errorResponse, 500);
});

export { testRoutes };
