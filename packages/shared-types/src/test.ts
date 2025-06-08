import { z } from "zod";

// ==================== ENUMS ====================
export const ModuleTypeEnum = z.enum([
  "intelligence",
  "personality",
  "aptitude",
  "interest",
  "projective",
  "cognitive",
]);

export const CategoryEnum = z.enum([
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
]);

export const TestStatusEnum = z.enum(["active", "inactive", "archived"]);

// ==================== REQUEST SCHEMAS ====================

// Create Test Request Schema
export const CreateTestRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Test name is required")
    .max(255, "Test name is too long"),
  description: z.string().optional(),
  module_type: ModuleTypeEnum,
  category: CategoryEnum,
  time_limit: z
    .number()
    .min(1, "Time limit must be at least 1 minute")
    .optional(),
  icon: z
    .string()
    .max(10, "Icon must be an emoji (max 10 characters)")
    .optional(),
  card_color: z.string().max(100, "Card color is too long").optional(),
  test_prerequisites: z
    .array(z.string().uuid("Invalid UUID format"))
    .max(10, "Too many prerequisites")
    .optional(),
  display_order: z.number().min(0, "Display order must be positive").optional(),
  subcategory: z
    .array(z.string())
    .max(2, "Maximum 2 subcategories allowed")
    .optional(),
  total_questions: z
    .number()
    .min(0, "Total questions must be positive")
    .optional(),
  passing_score: z
    .number()
    .min(0, "Passing score must be positive")
    .max(100, "Passing score cannot exceed 100")
    .optional(),
  status: TestStatusEnum.optional(),
  instructions: z.string().optional(),
});

// Update Test Request Schema
export const UpdateTestRequestSchema = z
  .object({
    name: z
      .string()
      .min(1, "Test name is required")
      .max(255, "Test name is too long")
      .optional(),
    description: z.string().optional(),
    module_type: ModuleTypeEnum.optional(),
    category: CategoryEnum.optional(),
    time_limit: z
      .number()
      .min(1, "Time limit must be at least 1 minute")
      .optional(),
    icon: z
      .string()
      .max(10, "Icon must be an emoji (max 10 characters)")
      .optional(),
    card_color: z.string().max(100, "Card color is too long").optional(),
    test_prerequisites: z
      .array(z.string().uuid("Invalid UUID format"))
      .max(10, "Too many prerequisites")
      .optional(),
    display_order: z
      .number()
      .min(0, "Display order must be positive")
      .optional(),
    subcategory: z
      .array(z.string())
      .max(2, "Maximum 2 subcategories allowed")
      .optional(),
    total_questions: z
      .number()
      .min(0, "Total questions must be positive")
      .optional(),
    passing_score: z
      .number()
      .min(0, "Passing score must be positive")
      .max(100, "Passing score cannot exceed 100")
      .optional(),
    status: TestStatusEnum.optional(),
    instructions: z.string().optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided for update
      const hasAtLeastOneField = Object.values(data).some(
        (value) => value !== undefined
      );
      return hasAtLeastOneField;
    },
    {
      message: "At least one field must be provided for update",
      path: ["root"],
    }
  );

// Update Test By ID Request Schema (Path Parameters)
export const UpdateTestByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Delete Test By ID Request Schema (Path Parameters)
export const DeleteTestByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Get Tests Request Schema (Query Parameters)
export const GetTestsRequestSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(10),

  // Search
  search: z.string().optional(), // Search by name or description

  // Filters
  module_type: ModuleTypeEnum.optional(),
  category: CategoryEnum.optional(),
  status: TestStatusEnum.optional(),

  // Time limit range filters
  time_limit_min: z.coerce
    .number()
    .min(0, "Time limit must be positive")
    .optional(),
  time_limit_max: z.coerce
    .number()
    .min(0, "Time limit must be positive")
    .optional(),

  // Question count filters
  total_questions_min: z.coerce
    .number()
    .min(0, "Questions count must be positive")
    .optional(),
  total_questions_max: z.coerce
    .number()
    .min(0, "Questions count must be positive")
    .optional(),

  // Date filters
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),

  // Sorting
  sort_by: z
    .enum([
      "name",
      "category",
      "module_type",
      "time_limit",
      "total_questions",
      "display_order",
      "created_at",
      "updated_at",
    ])
    .default("display_order"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
});

// Get Test By ID Request Schema (Path Parameters)
export const GetTestByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// ==================== RESPONSE SCHEMAS ====================

export const TestDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  module_type: ModuleTypeEnum,
  category: CategoryEnum,
  time_limit: z.number(), // in minutes
  icon: z.string().nullable(),
  card_color: z.string().nullable(),
  test_prerequisites: z.array(z.string().uuid()).nullable(),
  display_order: z.number(),
  subcategory: z.array(z.string()).nullable(),
  total_questions: z.number(),
  passing_score: z.number().nullable(),
  status: TestStatusEnum,
  instructions: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});

// Create Test Response Schema
export const CreateTestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestDataSchema,
  timestamp: z.string(),
});

// Update Test Response Schema
export const UpdateTestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestDataSchema,
  timestamp: z.string(),
});

// Delete Test Response Schema
export const DeleteTestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: CategoryEnum,
    deleted_at: z.string().datetime(),
  }),
  timestamp: z.string(),
});

// Get Test By ID Response Schema
export const GetTestByIdResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestDataSchema,
  timestamp: z.string(),
});

// Pagination Meta Schema (reuse from user.ts if needed)
export const TestPaginationMetaSchema = z.object({
  current_page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
  has_next_page: z.boolean(),
  has_prev_page: z.boolean(),
});

// Get Tests Response Schema
export const GetTestsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(TestDataSchema),
  meta: TestPaginationMetaSchema,
  filters: z
    .object({
      module_types: z.array(ModuleTypeEnum),
      categories: z.array(CategoryEnum),
      statuses: z.array(TestStatusEnum),
      time_limit_range: z.object({
        min: z.number(),
        max: z.number(),
      }),
      questions_count_range: z.object({
        min: z.number(),
        max: z.number(),
      }),
    })
    .optional(),
  timestamp: z.string(),
});

// Test Statistics Schema (for dashboard)
export const TestStatsSchema = z.object({
  total_tests: z.number(),
  active_tests: z.number(),
  inactive_tests: z.number(),
  archived_tests: z.number(),
  by_module_type: z.record(z.string(), z.number()),
  by_category: z.record(z.string(), z.number()),
  avg_time_limit: z.number(),
  avg_questions_count: z.number(),
});

export const GetTestStatsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: TestStatsSchema,
  timestamp: z.string(),
});

export const GetTestFilterOptionsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    module_types: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    categories: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    statuses: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
  }),
  timestamp: z.string().datetime(),
});

// Error response schema (reuse from user.ts)
export const TestErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const TestErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(TestErrorDetailSchema).optional(),
  timestamp: z.string(),
});

// ==================== CATEGORY & MODULE TYPE RESPONSE SCHEMAS ====================

// Get Categories Response Schema
export const GetCategoriesResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(
    z.object({
      value: CategoryEnum,
      label: z.string(),
      module_type: ModuleTypeEnum,
      default_time_limit: z.number(), // in minutes
      recommended_card_color: z.string(),
    })
  ),
  timestamp: z.string(),
});

// Get Module Types Response Schema
export const GetModuleTypesResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(
    z.object({
      value: ModuleTypeEnum,
      label: z.string(),
      categories: z.array(CategoryEnum),
      total_categories: z.number(),
    })
  ),
  timestamp: z.string(),
});

// ==================== UTILITY TYPES ====================
export type CategoryOption = {
  value: Category;
  label: string;
  module_type: ModuleType;
  default_time_limit: number;
  recommended_card_color: string;
};

export type ModuleTypeOption = {
  value: ModuleType;
  label: string;
  categories: Category[];
  total_categories: number;
};

// ==================== DISPLAY ORDER SCHEMAS ====================

// Update Test Display Order Request Schema (Body)
export const UpdateTestDisplayOrderRequestSchema = z.object({
  display_order: z
    .number()
    .min(0, "Display order must be positive")
    .int("Display order must be an integer"),
});

// Update Test Display Order By ID Request Schema (Path Parameters)
export const UpdateTestDisplayOrderByIdRequestSchema = z.object({
  testId: z.string().uuid("Invalid test ID format"),
});

// Update Test Display Order Response Schema
export const UpdateTestDisplayOrderResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    display_order: z.number(),
    updated_at: z.date(),
  }),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type ModuleType = z.infer<typeof ModuleTypeEnum>;
export type Category = z.infer<typeof CategoryEnum>;
export type TestStatus = z.infer<typeof TestStatusEnum>;

export type CreateTestRequest = z.infer<typeof CreateTestRequestSchema>;
export type CreateTestResponse = z.infer<typeof CreateTestResponseSchema>;
export type UpdateTestRequest = z.infer<typeof UpdateTestRequestSchema>;
export type UpdateTestByIdRequest = z.infer<typeof UpdateTestByIdRequestSchema>;
export type UpdateTestResponse = z.infer<typeof UpdateTestResponseSchema>;
export type DeleteTestByIdRequest = z.infer<typeof DeleteTestByIdRequestSchema>;
export type DeleteTestResponse = z.infer<typeof DeleteTestResponseSchema>;
export type GetTestsRequest = z.infer<typeof GetTestsRequestSchema>;
export type GetTestsResponse = z.infer<typeof GetTestsResponseSchema>;
export type GetTestByIdRequest = z.infer<typeof GetTestByIdRequestSchema>;
export type GetTestByIdResponse = z.infer<typeof GetTestByIdResponseSchema>;
export type TestPaginationMeta = z.infer<typeof TestPaginationMetaSchema>;
export type TestErrorResponse = z.infer<typeof TestErrorResponseSchema>;
export type TestData = z.infer<typeof TestDataSchema>;
export type TestErrorDetail = z.infer<typeof TestErrorDetailSchema>;
export type TestStats = z.infer<typeof TestStatsSchema>;
export type GetTestStatsResponse = z.infer<typeof GetTestStatsResponseSchema>;
export type GetTestFilterOptionsResponse = z.infer<
  typeof GetTestFilterOptionsResponseSchema
>;
export type GetCategoriesResponse = z.infer<typeof GetCategoriesResponseSchema>;
export type GetModuleTypesResponse = z.infer<
  typeof GetModuleTypesResponseSchema
>;
export type UpdateTestDisplayOrderRequest = z.infer<
  typeof UpdateTestDisplayOrderRequestSchema
>;
export type UpdateTestDisplayOrderByIdRequest = z.infer<
  typeof UpdateTestDisplayOrderByIdRequestSchema
>;
export type UpdateTestDisplayOrderResponse = z.infer<
  typeof UpdateTestDisplayOrderResponseSchema
>;

// ==================== DATABASE TYPES ====================
export type CreateTestDB = {
  name: string;
  description: string | null;
  module_type: ModuleType;
  category: Category;
  time_limit: number;
  icon: string | null;
  card_color: string | null;
  test_prerequisites: string[] | null;
  display_order: number;
  subcategory: string[] | null;
  total_questions: number;
  passing_score: string | null;
  status: TestStatus;
  instructions: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type UpdateTestDB = {
  name?: string;
  description?: string | null;
  module_type?: ModuleType;
  category?: Category;
  time_limit?: number;
  icon?: string | null;
  card_color?: string | null;
  test_prerequisites?: string[] | null;
  display_order?: number;
  subcategory?: string[] | null;
  total_questions?: number;
  passing_score?: string | null;
  status?: TestStatus;
  instructions?: string | null;
  updated_at: Date;
  updated_by?: string | null;
};

export type UpdateTestDisplayOrderDB = {
  display_order: number;
  updated_at: Date;
  updated_by: string;
};

// ==================== UTILITY TYPES ====================

// For frontend display
export type TestCardData = {
  id: string;
  name: string;
  description: string | null;
  module_type: ModuleType;
  category: Category;
  time_limit: number;
  icon: string | null;
  card_color: string | null;
  total_questions: number;
  display_order: number;
  status: TestStatus;
};

// For session creation
export type TestSelectionData = {
  id: string;
  name: string;
  category: Category;
  module_type: ModuleType;
  time_limit: number;
  total_questions: number;
  test_prerequisites: string[] | null;
  is_required: boolean;
  weight: number;
};

// Filter options for frontend
export type TestFilterOptions = {
  module_types: { value: ModuleType; label: string }[];
  categories: { value: Category; label: string }[];
  statuses: { value: TestStatus; label: string }[];
};

// ==================== VALIDATION HELPERS ====================

// Category validation by module type
export const CATEGORY_MODULE_MAPPING: Record<ModuleType, Category[]> = {
  intelligence: ["wais", "raven", "army_alpha", "iq"],
  personality: ["mbti", "big_five", "papi_kostick", "epps", "disc"],
  aptitude: ["kraepelin", "pauli"],
  interest: ["riasec"],
  projective: ["wartegg", "dap", "htp"],
  cognitive: ["eq"],
};

// Helper function to validate category for module type
export function validateCategoryForModuleType(
  category: Category,
  moduleType: ModuleType
): boolean {
  return CATEGORY_MODULE_MAPPING[moduleType].includes(category);
}

// Default time limits by category (in minutes)
export const DEFAULT_TIME_LIMITS: Record<Category, number> = {
  wais: 120,
  mbti: 30,
  wartegg: 45,
  riasec: 25,
  kraepelin: 60,
  pauli: 60,
  big_five: 20,
  papi_kostick: 30,
  dap: 30,
  raven: 45,
  epps: 40,
  army_alpha: 90,
  htp: 60,
  disc: 15,
  iq: 90,
  eq: 25,
};

// Helper function to get default time limit
export function getDefaultTimeLimitByCategory(category: Category): number {
  return DEFAULT_TIME_LIMITS[category];
}

// Recommended card colors by category
export const RECOMMENDED_CARD_COLORS: Record<Category, string> = {
  wais: "from-blue-500 to-blue-600",
  mbti: "from-purple-500 to-purple-600",
  wartegg: "from-green-500 to-green-600",
  riasec: "from-orange-500 to-orange-600",
  kraepelin: "from-red-500 to-red-600",
  pauli: "from-red-400 to-red-500",
  big_five: "from-indigo-500 to-indigo-600",
  papi_kostick: "from-pink-500 to-pink-600",
  dap: "from-teal-500 to-teal-600",
  raven: "from-slate-500 to-slate-600",
  epps: "from-violet-500 to-violet-600",
  army_alpha: "from-amber-500 to-amber-600",
  htp: "from-emerald-500 to-emerald-600",
  disc: "from-cyan-500 to-cyan-600",
  iq: "from-sky-500 to-sky-600",
  eq: "from-rose-500 to-rose-600",
};

// Helper function to get recommended card color
export function getRecommendedCardColorByCategory(category: Category): string {
  return RECOMMENDED_CARD_COLORS[category];
}

// ==================== CONSTANTS ====================
export const TEST_MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  intelligence: "Intelligence",
  personality: "Personality",
  aptitude: "Aptitude",
  interest: "Interest",
  projective: "Projective",
  cognitive: "Cognitive",
};

export const TEST_CATEGORY_LABELS: Record<Category, string> = {
  wais: "WAIS (Wechsler Adult Intelligence Scale)",
  mbti: "MBTI (Myers-Briggs Type Indicator)",
  wartegg: "Wartegg Drawing Test",
  riasec: "RIASEC (Holland Test)",
  kraepelin: "Kraepelin Test",
  pauli: "Pauli Test",
  big_five: "Big Five Personality",
  papi_kostick: "PAPI Kostick",
  dap: "DAP (Draw-A-Person)",
  raven: "Raven's Progressive Matrices",
  epps: "EPPS (Edwards Personal Preference Schedule)",
  army_alpha: "Army Alpha Test",
  htp: "HTP (House-Tree-Person)",
  disc: "DISC Assessment",
  iq: "IQ Test",
  eq: "EQ (Emotional Intelligence)",
};

export const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};
