import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  pgEnum,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== ENUMS ====================
export const roleEnum = pgEnum("role", ["admin", "participant"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const religionEnum = pgEnum("religion", [
  "islam",
  "kristen",
  "katolik",
  "hindu",
  "buddha",
  "konghucu",
  "other",
]);
export const educationEnum = pgEnum("education", [
  "sd",
  "smp",
  "sma",
  "diploma",
  "s1",
  "s2",
  "s3",
  "other",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "true_false",
  "text",
  "rating_scale",
  "drawing",
  "sequence",
  "matrix",
]);

export const testStatusEnum = pgEnum("test_status", [
  "active",
  "inactive",
  "archived",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "active",
  "expired",
  "completed",
  "cancelled",
]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "started",
  "in_progress",
  "completed",
  "abandoned",
  "expired",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "invited",
  "registered",
  "started",
  "completed",
  "no_show",
]);

export const moduleTypeEnum = pgEnum("module_type", [
  "intelligence",
  "personality",
  "aptitude",
  "interest",
  "projective",
  "cognitive",
]);

export const categoryEnum = pgEnum("category", [
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

// ==================== MAIN TABLES ====================

// Users Table with Authentication
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nik: varchar("nik", { length: 20 }).unique(),
    name: varchar("name", { length: 255 }).notNull(),
    role: roleEnum("role").notNull().default("participant"),
    email: varchar("email", { length: 255 }).notNull().unique(),

    // Authentication fields
    password: varchar("password", { length: 255 }), // Nullable - only for admin users
    last_login: timestamp("last_login"),
    login_attempts: integer("login_attempts").default(0),
    account_locked_until: timestamp("account_locked_until"),
    email_verified: boolean("email_verified").default(false),
    email_verification_token: varchar("email_verification_token", {
      length: 255,
    }),
    password_reset_token: varchar("password_reset_token", { length: 255 }),
    password_reset_expires: timestamp("password_reset_expires"),

    // Profile fields
    gender: genderEnum("gender"),
    phone: varchar("phone", { length: 20 }),
    birth_place: varchar("birth_place", { length: 100 }),
    birth_date: timestamp("birth_date"),
    religion: religionEnum("religion"),
    education: educationEnum("education"),
    address: text("address"),
    province: varchar("province", { length: 100 }),
    regency: varchar("regency", { length: 100 }),
    district: varchar("district", { length: 100 }),
    village: varchar("village", { length: 100 }),
    postal_code: varchar("postal_code", { length: 10 }),
    profile_picture_url: varchar("profile_picture_url", { length: 500 }),

    // System fields
    is_active: boolean("is_active").default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  },
  (table) => ({
    nikIdx: index("users_nik_idx").on(table.nik),
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    lastLoginIdx: index("users_last_login_idx").on(table.last_login),
    emailVerificationIdx: index("users_email_verification_idx").on(
      table.email_verification_token
    ),
    passwordResetIdx: index("users_password_reset_idx").on(
      table.password_reset_token
    ),
  })
);

// Authentication Sessions Table
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull().unique(),
    refresh_token: text("refresh_token").notNull().unique(),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    last_used: timestamp("last_used").defaultNow().notNull(),
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    is_active: boolean("is_active").default(true),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.user_id),
    tokenIdx: uniqueIndex("sessions_token_idx").on(table.token),
    refreshTokenIdx: uniqueIndex("sessions_refresh_token_idx").on(
      table.refresh_token
    ),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expires_at),
  })
);

// Tests Table
export const tests = pgTable(
  "tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    module_type: moduleTypeEnum("module_type").notNull(),
    category: categoryEnum("category").notNull(),
    time_limit: integer("time_limit").notNull(), // in minutes
    icon: varchar("icon", { length: 10 }), // emoji
    card_color: varchar("card_color", { length: 100 }), // e.g., "from-green-500 to-emerald-600"
    test_prerequisites: json("test_prerequisites").$type<string[]>(), // array of test IDs
    display_order: integer("display_order").default(0),
    subcategory: json("subcategory").$type<string[]>(), // max 2 items
    total_questions: integer("total_questions").default(0),
    passing_score: numeric("passing_score", { precision: 5, scale: 2 }),
    status: testStatusEnum("status").default("active"),
    instructions: text("instructions"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    created_by: uuid("created_by"),
    updated_by: uuid("updated_by"),
  },
  (table) => ({
    categoryIdx: index("tests_category_idx").on(table.category),
    moduleTypeIdx: index("tests_module_type_idx").on(table.module_type),
    statusIdx: index("tests_status_idx").on(table.status),
    displayOrderIdx: index("tests_display_order_idx").on(table.display_order),
  })
);

// Questions Table
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    test_id: uuid("test_id")
      .notNull()
      .references(() => tests.id),
    question: text("question").notNull(),
    question_type: questionTypeEnum("question_type").notNull(),
    options: json("options").$type<
      {
        value: string;
        label: string;
        score?: number;
      }[]
    >(), // for multiple choice, rating scale
    correct_answer: text("correct_answer"), // for scored questions
    sequence: integer("sequence").notNull(),
    time_limit: integer("time_limit"), // per question time limit in seconds
    image_url: varchar("image_url", { length: 500 }),
    audio_url: varchar("audio_url", { length: 500 }),
    scoring_key: json("scoring_key").$type<Record<string, number>>(), // for complex scoring
    is_required: boolean("is_required").default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    testIdIdx: index("questions_test_id_idx").on(table.test_id),
    sequenceIdx: index("questions_sequence_idx").on(
      table.test_id,
      table.sequence
    ),
    testSequenceUnique: uniqueIndex("questions_test_sequence_unique").on(
      table.test_id,
      table.sequence
    ),
  })
);

// Test Sessions Table
export const testSessions = pgTable(
  "test_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    session_name: varchar("session_name", { length: 255 }).notNull(),
    session_code: varchar("session_code", { length: 50 }).notNull().unique(),
    start_time: timestamp("start_time").notNull(),
    end_time: timestamp("end_time").notNull(),
    target_position: varchar("target_position", { length: 100 }), // security, staff, manager
    max_participants: integer("max_participants"),
    current_participants: integer("current_participants").default(0),
    status: sessionStatusEnum("status").default("draft"),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    proctor_id: uuid("proctor_id").references(() => users.id),
    auto_expire: boolean("auto_expire").default(true),
    allow_late_entry: boolean("allow_late_entry").default(false),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    created_by: uuid("created_by").references(() => users.id),
    updated_by: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    sessionCodeIdx: uniqueIndex("session_code_unique_idx").on(
      table.session_code
    ),
    statusIdx: index("sessions_status_idx").on(table.status),
    startTimeIdx: index("sessions_start_time_idx").on(table.start_time),
    targetPositionIdx: index("sessions_target_position_idx").on(
      table.target_position
    ),
  })
);

// Session Modules Table (junction table)
export const sessionModules = pgTable(
  "session_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => testSessions.id),
    test_id: uuid("test_id")
      .notNull()
      .references(() => tests.id),
    sequence: integer("sequence").notNull(),
    is_required: boolean("is_required").default(true),
    weight: numeric("weight", { precision: 3, scale: 2 }).default("1.00"), // for weighted scoring
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("session_modules_session_idx").on(table.session_id),
    testIdIdx: index("session_modules_test_idx").on(table.test_id),
    sessionSequenceUnique: uniqueIndex("session_modules_unique").on(
      table.session_id,
      table.sequence
    ),
    sessionTestUnique: uniqueIndex("session_test_unique").on(
      table.session_id,
      table.test_id
    ),
  })
);

// Test Attempts Table
export const testAttempts = pgTable(
  "test_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    test_id: uuid("test_id")
      .notNull()
      .references(() => tests.id),
    session_test_id: uuid("session_test_id").references(() => testSessions.id),
    start_time: timestamp("start_time").notNull(),
    end_time: timestamp("end_time"),
    actual_end_time: timestamp("actual_end_time"),
    status: attemptStatusEnum("status").notNull().default("started"),
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    browser_info: json("browser_info"),
    attempt_number: integer("attempt_number").default(1),
    time_spent: integer("time_spent"), // in seconds
    questions_answered: integer("questions_answered").default(0),
    total_questions: integer("total_questions"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("attempts_user_id_idx").on(table.user_id),
    testIdIdx: index("attempts_test_id_idx").on(table.test_id),
    sessionIdIdx: index("attempts_session_id_idx").on(table.session_test_id),
    statusIdx: index("attempts_status_idx").on(table.status),
    startTimeIdx: index("attempts_start_time_idx").on(table.start_time),
  })
);

// User Answers Table
export const userAnswers = pgTable(
  "user_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    question_id: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    attempt_id: uuid("attempt_id")
      .notNull()
      .references(() => testAttempts.id),
    answer: text("answer"), // could be text, JSON, or file path for drawings
    answer_data: json("answer_data"), // for complex answers (drawings, arrays, etc.)
    score: numeric("score", { precision: 5, scale: 2 }),
    time_taken: integer("time_taken"), // in seconds
    is_correct: boolean("is_correct"),
    confidence_level: integer("confidence_level"), // 1-5 scale
    answered_at: timestamp("answered_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userQuestionIdx: index("answers_user_question_idx").on(
      table.user_id,
      table.question_id
    ),
    attemptIdx: index("answers_attempt_idx").on(table.attempt_id),
    userQuestionAttemptUnique: uniqueIndex("answers_unique").on(
      table.user_id,
      table.question_id,
      table.attempt_id
    ),
  })
);

// Test Results Table
export const testResults = pgTable(
  "test_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attempt_id: uuid("attempt_id")
      .notNull()
      .references(() => testAttempts.id),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    test_id: uuid("test_id")
      .notNull()
      .references(() => tests.id),
    session_result_id: uuid("session_result_id").references(
      () => sessionResults.id
    ),
    raw_score: numeric("raw_score", { precision: 8, scale: 2 }),
    scaled_score: numeric("scaled_score", { precision: 8, scale: 2 }),
    percentile: numeric("percentile", { precision: 5, scale: 2 }),
    grade: varchar("grade", { length: 10 }), // A, B, C, D, E
    traits: json("traits").$type<
      {
        name: string;
        score: number;
        description: string;
        category: string;
      }[]
    >(),
    trait_names: json("trait_names").$type<string[]>(), // backward compatibility
    description: text("description"),
    recommendations: text("recommendations"),
    detailed_analysis: json("detailed_analysis"),
    is_passed: boolean("is_passed"),
    completion_percentage: numeric("completion_percentage", {
      precision: 5,
      scale: 2,
    }),
    calculated_at: timestamp("calculated_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: uniqueIndex("results_attempt_unique").on(table.attempt_id),
    userTestIdx: index("results_user_test_idx").on(
      table.user_id,
      table.test_id
    ),
    sessionResultIdx: index("results_session_idx").on(table.session_result_id),
  })
);

// Session Results Table (aggregate results)
export const sessionResults = pgTable(
  "session_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => testSessions.id),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    total_score: numeric("total_score", { precision: 8, scale: 2 }),
    weighted_score: numeric("weighted_score", { precision: 8, scale: 2 }),
    overall_percentile: numeric("overall_percentile", {
      precision: 5,
      scale: 2,
    }),
    overall_grade: varchar("overall_grade", { length: 10 }),
    recommended_positions: json("recommended_positions").$type<
      {
        position: string;
        compatibility_score: number;
        confidence: string;
        reasons: string[];
      }[]
    >(),
    primary_traits: json("primary_traits").$type<string[]>(),
    personality_summary: text("personality_summary"),
    strengths: json("strengths").$type<string[]>(),
    areas_for_development: json("areas_for_development").$type<string[]>(),
    summary_description: text("summary_description"),
    completion_rate: numeric("completion_rate", { precision: 5, scale: 2 }),
    time_efficiency: numeric("time_efficiency", { precision: 5, scale: 2 }),
    consistency_score: numeric("consistency_score", { precision: 5, scale: 2 }),
    is_final: boolean("is_final").default(false),
    completed_at: timestamp("completed_at"),
    reviewed_by: uuid("reviewed_by").references(() => users.id),
    reviewed_at: timestamp("reviewed_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionUserUnique: uniqueIndex("session_results_unique").on(
      table.session_id,
      table.user_id
    ),
    sessionIdx: index("session_results_session_idx").on(table.session_id),
    userIdx: index("session_results_user_idx").on(table.user_id),
    completedAtIdx: index("session_results_completed_idx").on(
      table.completed_at
    ),
  })
);

// ==================== AUDIT & ADDITIONAL TABLES ====================

// Session Participants Table (for tracking who's invited/registered)
export const sessionParticipants = pgTable(
  "session_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => testSessions.id),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: participantStatusEnum("status").default("invited"),
    registered_at: timestamp("registered_at"),
    invitation_sent_at: timestamp("invitation_sent_at"),
    unique_link: varchar("unique_link", { length: 255 }).unique(),
    link_expires_at: timestamp("link_expires_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionUserUnique: uniqueIndex("participants_unique").on(
      table.session_id,
      table.user_id
    ),
    sessionIdx: index("participants_session_idx").on(table.session_id),
    statusIdx: index("participants_status_idx").on(table.status),
    linkIdx: index("participants_link_idx").on(table.unique_link),
  })
);

// Audit Logs Table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id").references(() => users.id),
    session_id: uuid("session_id").references(() => testSessions.id),
    attempt_id: uuid("attempt_id").references(() => testAttempts.id),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 50 }).notNull(),
    entity_id: uuid("entity_id"),
    old_values: json("old_values"),
    new_values: json("new_values"),
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("audit_user_idx").on(table.user_id),
    actionIdx: index("audit_action_idx").on(table.action),
    entityIdx: index("audit_entity_idx").on(table.entity, table.entity_id),
    createdAtIdx: index("audit_created_at_idx").on(table.created_at),
  })
);

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  testAttempts: many(testAttempts),
  userAnswers: many(userAnswers),
  testResults: many(testResults),
  sessionResults: many(sessionResults),
  sessionParticipants: many(sessionParticipants),
  authSessions: many(authSessions),
  createdSessions: many(testSessions, { relationName: "createdBy" }),
  proctorSessions: many(testSessions, { relationName: "proctor" }),
  auditLogs: many(auditLogs),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.user_id],
    references: [users.id],
  }),
}));

export const testsRelations = relations(tests, ({ many }) => ({
  questions: many(questions),
  testAttempts: many(testAttempts),
  testResults: many(testResults),
  sessionModules: many(sessionModules),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  test: one(tests, {
    fields: [questions.test_id],
    references: [tests.id],
  }),
  userAnswers: many(userAnswers),
}));

export const testSessionsRelations = relations(
  testSessions,
  ({ one, many }) => ({
    sessionModules: many(sessionModules),
    testAttempts: many(testAttempts),
    sessionResults: many(sessionResults),
    sessionParticipants: many(sessionParticipants),
    proctor: one(users, {
      fields: [testSessions.proctor_id],
      references: [users.id],
      relationName: "proctor",
    }),
    createdBy: one(users, {
      fields: [testSessions.created_by],
      references: [users.id],
      relationName: "createdBy",
    }),
  })
);

export const sessionModulesRelations = relations(sessionModules, ({ one }) => ({
  session: one(testSessions, {
    fields: [sessionModules.session_id],
    references: [testSessions.id],
  }),
  test: one(tests, {
    fields: [sessionModules.test_id],
    references: [tests.id],
  }),
}));

export const testAttemptsRelations = relations(
  testAttempts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [testAttempts.user_id],
      references: [users.id],
    }),
    test: one(tests, {
      fields: [testAttempts.test_id],
      references: [tests.id],
    }),
    session: one(testSessions, {
      fields: [testAttempts.session_test_id],
      references: [testSessions.id],
    }),
    userAnswers: many(userAnswers),
    testResults: many(testResults),
  })
);

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  user: one(users, {
    fields: [userAnswers.user_id],
    references: [users.id],
  }),
  question: one(questions, {
    fields: [userAnswers.question_id],
    references: [questions.id],
  }),
  attempt: one(testAttempts, {
    fields: [userAnswers.attempt_id],
    references: [testAttempts.id],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [testResults.attempt_id],
    references: [testAttempts.id],
  }),
  user: one(users, {
    fields: [testResults.user_id],
    references: [users.id],
  }),
  test: one(tests, {
    fields: [testResults.test_id],
    references: [tests.id],
  }),
  sessionResult: one(sessionResults, {
    fields: [testResults.session_result_id],
    references: [sessionResults.id],
  }),
}));

export const sessionResultsRelations = relations(
  sessionResults,
  ({ one, many }) => ({
    session: one(testSessions, {
      fields: [sessionResults.session_id],
      references: [testSessions.id],
    }),
    user: one(users, {
      fields: [sessionResults.user_id],
      references: [users.id],
    }),
    testResults: many(testResults),
    reviewedBy: one(users, {
      fields: [sessionResults.reviewed_by],
      references: [users.id],
      relationName: "reviewer",
    }),
  })
);

export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one }) => ({
    session: one(testSessions, {
      fields: [sessionParticipants.session_id],
      references: [testSessions.id],
    }),
    user: one(users, {
      fields: [sessionParticipants.user_id],
      references: [users.id],
    }),
  })
);

// ==================== TYPES ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type Test = typeof tests.$inferSelect;
export type NewTest = typeof tests.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type TestSession = typeof testSessions.$inferSelect;
export type NewTestSession = typeof testSessions.$inferInsert;
export type SessionModule = typeof sessionModules.$inferSelect;
export type NewSessionModule = typeof sessionModules.$inferInsert;
export type TestAttempt = typeof testAttempts.$inferSelect;
export type NewTestAttempt = typeof testAttempts.$inferInsert;
export type UserAnswer = typeof userAnswers.$inferSelect;
export type NewUserAnswer = typeof userAnswers.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
export type SessionResult = typeof sessionResults.$inferSelect;
export type NewSessionResult = typeof sessionResults.$inferInsert;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type NewSessionParticipant = typeof sessionParticipants.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
