import { Context } from "hono";
import { type CloudflareBindings } from "../../lib/env";
import { CreateTestRequestSchema, UpdateTestRequestSchema } from "shared-types";

export async function getTestSchemaHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const response = {
      success: true,
      message: "Test schema retrieved successfully",
      data: {
        create_schema: CreateTestRequestSchema,
        update_schema: UpdateTestRequestSchema,
        enums: {
          module_types: ["learning", "assessment", "certification"],
          categories: [
            "wais",
            "mbti",
            "wartegg",
            "riasec",
            "kraepelin",
            "pauli",
            "big_five",
            "papi_kostick",
            "dap",
            "raven",
            "epps",
            "army_alpha",
            "htp",
            "disc",
            "iq",
            "eq",
          ],
          statuses: ["draft", "active", "inactive", "archived"],
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting test schema:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve test schema",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}
