import { Context } from "hono";
import { type CloudflareBindings } from "../../lib/env";
import {
  type GetModuleTypesResponse,
  type TestErrorResponse,
  ModuleTypeEnum,
  TEST_MODULE_TYPE_LABELS,
  CATEGORY_MODULE_MAPPING,
  type ModuleType,
} from "shared-types";

export async function getModuleTypesHandler(
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
            message: "Only admin users can access test module types",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Build module types data
    const moduleTypesData = ModuleTypeEnum.options.map(
      (moduleType: ModuleType) => {
        const categories = CATEGORY_MODULE_MAPPING[moduleType];

        return {
          value: moduleType,
          label: TEST_MODULE_TYPE_LABELS[moduleType],
          categories: categories,
          total_categories: categories.length,
        };
      }
    );

    const response: GetModuleTypesResponse = {
      success: true,
      message: "Test module types retrieved successfully",
      data: moduleTypesData,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Test module types accessed by admin: ${auth.user.email}`);

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test module types:", error);

    const errorResponse: TestErrorResponse = {
      success: false,
      message: "Failed to retrieve test module types",
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
