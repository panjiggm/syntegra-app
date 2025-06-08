import { Context } from "hono";
import { type CloudflareBindings } from "../../lib/env";
import {
  type GetCategoriesResponse,
  type TestErrorResponse,
  CategoryEnum,
  TEST_CATEGORY_LABELS,
  CATEGORY_MODULE_MAPPING,
  DEFAULT_TIME_LIMITS,
  RECOMMENDED_CARD_COLORS,
  type Category,
  type ModuleType,
} from "shared-types";

export async function getCategoriesHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: TestErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can access test categories",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Build categories data
    const categoriesData = CategoryEnum.options.map((category: Category) => {
      // Find which module type this category belongs to
      const moduleType = Object.entries(CATEGORY_MODULE_MAPPING).find(
        ([_, categories]) => categories.includes(category)
      )?.[0] as ModuleType;

      return {
        value: category,
        label: TEST_CATEGORY_LABELS[category],
        module_type: moduleType,
        default_time_limit: DEFAULT_TIME_LIMITS[category],
        recommended_card_color: RECOMMENDED_CARD_COLORS[category],
      };
    });

    const response: GetCategoriesResponse = {
      success: true,
      message: "Test categories retrieved successfully",
      data: categoriesData,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Test categories accessed by admin: ${auth.user.email}`);

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test categories:", error);

    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Failed to retrieve test categories",
      ...(c.env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "INTERNAL_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
