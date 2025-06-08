import { Context } from "hono";
import { type CloudflareBindings } from "@/lib/env";
import { type QuestionErrorResponse } from "shared-types";

export async function reorderQuestionsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  const errorResponse: QuestionErrorResponse = {
    success: false,
    message: "Reorder questions not implemented yet",
    timestamp: new Date().toISOString(),
  };
  return c.json(errorResponse, 501);
}
