import { z } from "zod";

// ==================== ENUMS ====================
export const DashboardPeriodEnum = z.enum([
  "today",
  "week",
  "month",
  "quarter",
  "year",
  "all_time",
]);

export const ActivityTypeEnum = z.enum([
  "login",
  "test_started",
  "test_completed",
  "session_created",
  "user_registered",
]);

// ==================== REQUEST SCHEMAS ====================

// Admin Dashboard Query Schema
export const GetAdminDashboardQuerySchema = z.object({
  period: DashboardPeriodEnum.default("month"),
  include_activity: z.coerce.boolean().default(true),
  include_trends: z.coerce.boolean().default(true),
  activity_limit: z.coerce.number().min(1).max(50).default(10),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Participant Dashboard Query Schema
export const GetParticipantDashboardQuerySchema = z.object({
  include_upcoming_sessions: z.coerce.boolean().default(true),
  include_profile_completion: z.coerce.boolean().default(true),
  include_recent_activity: z.coerce.boolean().default(true),
});

// ==================== RESPONSE SCHEMAS ====================

// Profile Completion Schema
export const ProfileCompletionSchema = z.object({
  completion_percentage: z.number().min(0).max(100),
  total_fields: z.number(),
  completed_fields: z.number(),
  missing_fields: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// Test Summary Schema (for participants - NO SCORES/RESULTS)
export const ParticipantTestSummarySchema = z.object({
  total_tests: z.number(),
  available_tests: z.number(),
  completed_tests: z.number(),
  in_progress_tests: z.number(),
  not_started_tests: z.number(),
  expired_tests: z.number(),
  total_time_spent_minutes: z.number(),
  average_time_per_test_minutes: z.number(),
  completion_rate_percentage: z.number(),
});

// Session Summary Schema (for participants)
export const ParticipantSessionSummarySchema = z.object({
  total_sessions: z.number(),
  active_sessions: z.number(),
  completed_sessions: z.number(),
  upcoming_sessions: z.number(),
  expired_sessions: z.number(),
});

// Recent Activity Schema (for participants)
export const ParticipantRecentActivitySchema = z.object({
  type: ActivityTypeEnum,
  title: z.string(),
  description: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

// Upcoming Session Schema
export const UpcomingSessionSchema = z.object({
  id: z.string().uuid(),
  session_name: z.string(),
  session_code: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  target_position: z.string().nullable(),
  location: z.string().nullable(),
  test_count: z.number(),
  estimated_duration_minutes: z.number(),
  status: z.string(),
  can_access: z.boolean(),
  access_url: z.string().nullable(),
});

// ==================== ADMIN DASHBOARD SCHEMAS ====================

// System Statistics Schema
export const SystemStatsSchema = z.object({
  total_users: z.number(),
  active_users: z.number(),
  new_users_this_period: z.number(),
  total_sessions: z.number(),
  active_sessions: z.number(),
  total_tests: z.number(),
  active_tests: z.number(),
  total_attempts: z.number(),
  completed_attempts: z.number(),
  total_results: z.number(),
});

// User Statistics Schema
export const UserStatsSchema = z.object({
  total_participants: z.number(),
  total_admins: z.number(),
  new_registrations_this_period: z.number(),
  active_users_this_period: z.number(),
  top_active_users: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      total_attempts: z.number(),
      last_activity: z.string().datetime(),
    })
  ),
  user_growth_trend: z.array(
    z.object({
      date: z.string().date(),
      count: z.number(),
    })
  ),
});

// Test Statistics Schema
export const DashboardTestStatsSchema = z.object({
  total_attempts_this_period: z.number(),
  completed_attempts_this_period: z.number(),
  average_completion_rate: z.number(),
  average_score: z.number(),
  most_popular_tests: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
      attempt_count: z.number(),
      completion_rate: z.number(),
      average_score: z.number(),
    })
  ),
  completion_trend: z.array(
    z.object({
      date: z.string().date(),
      completed: z.number(),
      total: z.number(),
    })
  ),
});

// Session Statistics Schema
export const DashboardSessionStatsSchema = z.object({
  sessions_this_period: z.number(),
  active_sessions: z.number(),
  completed_sessions: z.number(),
  total_participants_this_period: z.number(),
  average_session_duration_minutes: z.number(),
  upcoming_sessions: z.array(
    z.object({
      id: z.string().uuid(),
      session_name: z.string(),
      start_time: z.string().datetime(),
      participant_count: z.number(),
      max_participants: z.number().nullable(),
    })
  ),
});

// Recent Activity Schema (for admin)
export const AdminRecentActivitySchema = z.object({
  type: ActivityTypeEnum,
  title: z.string(),
  description: z.string(),
  user_id: z.string().uuid().optional(),
  user_name: z.string().optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

// Performance Metrics Schema
export const PerformanceMetricsSchema = z.object({
  server_response_time_ms: z.number(),
  database_query_time_ms: z.number(),
  active_connections: z.number(),
  error_rate_percentage: z.number(),
  uptime_percentage: z.number(),
  storage_usage_mb: z.number(),
  bandwidth_usage_mb: z.number(),
});

// Trend Data Schema
export const TrendDataSchema = z.object({
  period_label: z.string(),
  user_registrations: z.array(
    z.object({
      date: z.string().date(),
      count: z.number(),
    })
  ),
  test_attempts: z.array(
    z.object({
      date: z.string().date(),
      count: z.number(),
    })
  ),
  session_activities: z.array(
    z.object({
      date: z.string().date(),
      sessions_created: z.number(),
      sessions_completed: z.number(),
    })
  ),
});

// ==================== MAIN RESPONSE SCHEMAS ====================

// Participant Dashboard Response
export const GetParticipantDashboardResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      nik: z.string(),
      role: z.string(),
      last_login: z.string().datetime().nullable(),
      profile_picture_url: z.string().nullable(),
    }),
    profile_completion: ProfileCompletionSchema,
    test_summary: ParticipantTestSummarySchema,
    session_summary: ParticipantSessionSummarySchema,
    upcoming_sessions: z.array(UpcomingSessionSchema),
    recent_activity: z.array(ParticipantRecentActivitySchema),
    quick_actions: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        action_url: z.string(),
        icon: z.string(),
        priority: z.number(),
      })
    ),
  }),
  timestamp: z.string().datetime(),
});

// Admin Dashboard Response
export const GetAdminDashboardResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    system_overview: SystemStatsSchema,
    user_statistics: UserStatsSchema,
    test_statistics: DashboardTestStatsSchema,
    session_statistics: DashboardSessionStatsSchema,
    recent_activity: z.array(AdminRecentActivitySchema),
    performance_metrics: PerformanceMetricsSchema,
    trend_data: TrendDataSchema.optional(),
    alerts: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["info", "warning", "error", "success"]),
        title: z.string(),
        message: z.string(),
        timestamp: z.string().datetime(),
        action_url: z.string().optional(),
      })
    ),
  }),
  period: DashboardPeriodEnum,
  timestamp: z.string().datetime(),
});

// Error Response Schema
export const DashboardErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const DashboardErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(DashboardErrorDetailSchema).optional(),
  timestamp: z.string().datetime(),
});

// ==================== TYPE EXPORTS ====================
export type DashboardPeriod = z.infer<typeof DashboardPeriodEnum>;
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

export type GetAdminDashboardQuery = z.infer<
  typeof GetAdminDashboardQuerySchema
>;
export type GetParticipantDashboardQuery = z.infer<
  typeof GetParticipantDashboardQuerySchema
>;

export type ProfileCompletion = z.infer<typeof ProfileCompletionSchema>;
export type ParticipantTestSummary = z.infer<
  typeof ParticipantTestSummarySchema
>;
export type ParticipantSessionSummary = z.infer<
  typeof ParticipantSessionSummarySchema
>;
export type ParticipantRecentActivity = z.infer<
  typeof ParticipantRecentActivitySchema
>;
export type UpcomingSession = z.infer<typeof UpcomingSessionSchema>;

export type SystemStats = z.infer<typeof SystemStatsSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type DashboardTestStats = z.infer<typeof DashboardTestStatsSchema>;
export type DashboardSessionStats = z.infer<typeof DashboardSessionStatsSchema>;
export type AdminRecentActivity = z.infer<typeof AdminRecentActivitySchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type TrendData = z.infer<typeof TrendDataSchema>;

export type GetParticipantDashboardResponse = z.infer<
  typeof GetParticipantDashboardResponseSchema
>;
export type GetAdminDashboardResponse = z.infer<
  typeof GetAdminDashboardResponseSchema
>;
export type DashboardErrorResponse = z.infer<
  typeof DashboardErrorResponseSchema
>;
export type DashboardErrorDetail = z.infer<typeof DashboardErrorDetailSchema>;

// ==================== UTILITY FUNCTIONS ====================

// Calculate profile completion percentage
export function calculateProfileCompletion(user: any): ProfileCompletion {
  const requiredFields = [
    "name",
    "email",
    "nik",
    "gender",
    "phone",
    "birth_place",
    "birth_date",
    "religion",
    "education",
    "address",
    "province",
    "regency",
    "district",
    "village",
    "postal_code",
  ];

  const completedFields = requiredFields.filter(
    (field) => user[field] && user[field].toString().trim() !== ""
  );

  const missingFields = requiredFields.filter(
    (field) => !user[field] || user[field].toString().trim() === ""
  );

  const completionPercentage = Math.round(
    (completedFields.length / requiredFields.length) * 100
  );

  const suggestions = [];
  if (missingFields.includes("phone")) {
    suggestions.push("Tambahkan nomor telepon untuk notifikasi penting");
  }
  if (missingFields.includes("address")) {
    suggestions.push("Lengkapi alamat untuk keperluan sertifikat");
  }
  if (missingFields.includes("birth_date")) {
    suggestions.push("Isi tanggal lahir untuk analisis psikologi yang akurat");
  }

  return {
    completion_percentage: completionPercentage,
    total_fields: requiredFields.length,
    completed_fields: completedFields.length,
    missing_fields: missingFields,
    suggestions,
  };
}

// Get date range for period
export function getDateRangeForPeriod(period: DashboardPeriod): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const to = new Date(now);
  let from: Date;

  switch (period) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "all_time":
    default:
      from = new Date(2020, 0, 1); // Arbitrary start date
      break;
  }

  return { from, to };
}

// Format activity for display
export function formatActivityForDisplay(
  type: ActivityType,
  metadata: Record<string, any> = {}
): { title: string; description: string } {
  switch (type) {
    case "login":
      return {
        title: "Login ke sistem",
        description: "Anda berhasil masuk ke sistem",
      };
    case "test_started":
      return {
        title: "Memulai tes",
        description: `Memulai tes ${metadata.test_name || "psikologi"}`,
      };
    case "test_completed":
      return {
        title: "Menyelesaikan tes",
        description: `Menyelesaikan tes ${metadata.test_name || "psikologi"}`,
      };
    case "session_created":
      return {
        title: "Sesi baru dibuat",
        description: `Sesi "${metadata.session_name}" telah dibuat`,
      };
    case "user_registered":
      return {
        title: "Registrasi pengguna baru",
        description: `${metadata.user_name} mendaftar sebagai ${metadata.role}`,
      };
    default:
      return {
        title: "Aktivitas sistem",
        description: "Aktivitas tidak diketahui",
      };
  }
}

// ==================== CONSTANTS ====================
export const DASHBOARD_PERIODS: Record<DashboardPeriod, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  quarter: "Kuartal Ini",
  year: "Tahun Ini",
  all_time: "Sepanjang Waktu",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  login: "Login",
  test_started: "Tes Dimulai",
  test_completed: "Tes Selesai",
  session_created: "Sesi Dibuat",
  user_registered: "Registrasi Pengguna",
};

export const QUICK_ACTIONS = {
  PARTICIPANT: [
    {
      title: "Lengkapi Profil",
      description: "Lengkapi data profil Anda",
      action_url: "/profile",
      icon: "👤",
      priority: 1,
    },
    {
      title: "Lihat Jadwal Tes",
      description: "Cek jadwal tes yang akan datang",
      action_url: "/schedule",
      icon: "📅",
      priority: 2,
    },
    {
      title: "Panduan Tes",
      description: "Pelajari cara mengerjakan tes",
      action_url: "/guide",
      icon: "📖",
      priority: 3,
    },
  ],
  ADMIN: [
    {
      title: "Buat Sesi Baru",
      description: "Buat sesi tes baru",
      action_url: "/admin/sessions/create",
      icon: "➕",
      priority: 1,
    },
    {
      title: "Kelola Pengguna",
      description: "Kelola data pengguna",
      action_url: "/admin/participants",
      icon: "👥",
      priority: 2,
    },
    {
      title: "Lihat Laporan",
      description: "Lihat laporan dan analitik",
      action_url: "/admin/reports",
      icon: "📊",
      priority: 3,
    },
  ],
};

// Maximum items for various lists
export const DASHBOARD_LIMITS = {
  RECENT_ACTIVITY: 10,
  UPCOMING_SESSIONS: 5,
  TOP_USERS: 5,
  POPULAR_TESTS: 5,
  UPCOMING_ADMIN_SESSIONS: 3,
  ALERTS: 10,
} as const;
