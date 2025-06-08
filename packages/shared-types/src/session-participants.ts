import { z } from "zod";
import { SessionPaginationMetaSchema, SessionStatusEnum } from "./session";

// ==================== PARTICIPANT STATUS ENUM ====================
export const ParticipantStatusEnum = z.enum([
  "invited",
  "registered",
  "started",
  "completed",
  "no_show",
]);

// ==================== SESSION PARTICIPANT REQUEST SCHEMAS ====================

// Add Participant to Session Request Schema (Body)
export const AddParticipantToSessionRequestSchema = z.object({
  user_id: z.string().uuid("Invalid user ID format"),
  send_invitation: z.boolean().default(false), // Whether to send invitation email/notification
  custom_message: z.string().max(500, "Custom message is too long").optional(),
  link_expires_hours: z
    .number()
    .min(1, "Link expiry must be at least 1 hour")
    .max(168, "Link expiry cannot exceed 7 days (168 hours)")
    .default(24), // Default 24 hours
});

// Add Participant to Session By ID Request Schema (Path Parameters)
export const AddParticipantToSessionByIdRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

// Bulk Add Participants Request Schema
export const BulkAddParticipantsToSessionRequestSchema = z
  .object({
    participants: z
      .array(
        z.object({
          user_id: z.string().uuid("Invalid user ID format"),
          custom_message: z
            .string()
            .max(500, "Custom message is too long")
            .optional(),
        })
      )
      .min(1, "At least one participant is required")
      .max(50, "Maximum 50 participants can be added at once"),
    send_invitations: z.boolean().default(false),
    link_expires_hours: z
      .number()
      .min(1, "Link expiry must be at least 1 hour")
      .max(168, "Link expiry cannot exceed 7 days")
      .default(24),
  })
  .refine(
    (data) => {
      // Check for duplicate user IDs
      const userIds = data.participants.map((p) => p.user_id);
      const uniqueUserIds = new Set(userIds);
      return userIds.length === uniqueUserIds.size;
    },
    {
      message: "Duplicate user IDs are not allowed",
      path: ["participants"],
    }
  );

// Remove Participant from Session Request Schema (Path Parameters)
export const RemoveParticipantFromSessionRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
  participantId: z.string().uuid("Invalid participant ID format"),
});

// Update Participant Status Request Schema (Body)
export const UpdateParticipantStatusRequestSchema = z.object({
  status: ParticipantStatusEnum,
  notes: z.string().max(500, "Notes are too long").optional(),
});

// Get Session Participants Request Schema (Query Parameters)
export const GetSessionParticipantsRequestSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .min(1)
    .max(100, "Limit must be between 1 and 100")
    .default(20),

  // Search
  search: z.string().optional(), // Search by participant name, NIK, or email

  // Filters
  status: ParticipantStatusEnum.optional(),
  invitation_sent: z.coerce.boolean().optional(),
  registered: z.coerce.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      "name",
      "nik",
      "email",
      "status",
      "registered_at",
      "invitation_sent_at",
      "created_at",
    ])
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// ==================== RESPONSE SCHEMAS ====================

// Session Participant Data Schema
export const SessionParticipantDataSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: ParticipantStatusEnum,
  registered_at: z.date().nullable(),
  invitation_sent_at: z.date().nullable(),
  unique_link: z.string().nullable(),
  link_expires_at: z.date().nullable(),
  created_at: z.date(),

  // User details (populated from join)
  user: z
    .object({
      id: z.string().uuid(),
      nik: z.string(),
      name: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      gender: z.string().nullable(),
      birth_date: z.date().nullable(),
      is_active: z.boolean(),
    })
    .optional(),

  // Computed fields
  is_link_expired: z.boolean().optional(),
  access_url: z.string().optional(), // Full URL for participant access
});

// Add Participant to Session Response Schema
export const AddParticipantToSessionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: SessionParticipantDataSchema,
  timestamp: z.string(),
});

// Bulk Add Participants Response Schema
export const BulkAddParticipantsToSessionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    added_participants: z.array(SessionParticipantDataSchema),
    total_added: z.number(),
    skipped_participants: z
      .array(
        z.object({
          user_id: z.string().uuid(),
          user_name: z.string(),
          reason: z.string(),
        })
      )
      .optional(),
    invitation_status: z
      .object({
        sent: z.number(),
        failed: z.number(),
        skipped: z.number(),
      })
      .optional(),
  }),
  timestamp: z.string(),
});

// Remove Participant Response Schema
export const RemoveParticipantFromSessionResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    user_id: z.string().uuid(),
    user_name: z.string(),
    removed_at: z.string().datetime(),
  }),
  timestamp: z.string(),
});

// Get Session Participants Response Schema
export const GetSessionParticipantsResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(SessionParticipantDataSchema),
  meta: SessionPaginationMetaSchema,
  session_info: z.object({
    id: z.string().uuid(),
    session_name: z.string(),
    session_code: z.string(),
    target_position: z.string(),
    max_participants: z.number().nullable(),
    current_participants: z.number(),
    status: SessionStatusEnum,
  }),
  filters: z
    .object({
      statuses: z.array(ParticipantStatusEnum),
    })
    .optional(),
  timestamp: z.string(),
});

// Update Participant Status Response Schema
export const UpdateParticipantStatusResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    user_name: z.string(),
    old_status: ParticipantStatusEnum,
    new_status: ParticipantStatusEnum,
    updated_at: z.string().datetime(),
  }),
  timestamp: z.string(),
});

// ==================== TYPE EXPORTS ====================
export type ParticipantStatus = z.infer<typeof ParticipantStatusEnum>;
export type SessionParticipantData = z.infer<
  typeof SessionParticipantDataSchema
>;

export type AddParticipantToSessionRequest = z.infer<
  typeof AddParticipantToSessionRequestSchema
>;
export type AddParticipantToSessionByIdRequest = z.infer<
  typeof AddParticipantToSessionByIdRequestSchema
>;
export type AddParticipantToSessionResponse = z.infer<
  typeof AddParticipantToSessionResponseSchema
>;

export type BulkAddParticipantsToSessionRequest = z.infer<
  typeof BulkAddParticipantsToSessionRequestSchema
>;
export type BulkAddParticipantsToSessionResponse = z.infer<
  typeof BulkAddParticipantsToSessionResponseSchema
>;

export type RemoveParticipantFromSessionRequest = z.infer<
  typeof RemoveParticipantFromSessionRequestSchema
>;
export type RemoveParticipantFromSessionResponse = z.infer<
  typeof RemoveParticipantFromSessionResponseSchema
>;

export type GetSessionParticipantsRequest = z.infer<
  typeof GetSessionParticipantsRequestSchema
>;
export type GetSessionParticipantsResponse = z.infer<
  typeof GetSessionParticipantsResponseSchema
>;

export type UpdateParticipantStatusRequest = z.infer<
  typeof UpdateParticipantStatusRequestSchema
>;
export type UpdateParticipantStatusResponse = z.infer<
  typeof UpdateParticipantStatusResponseSchema
>;

// ==================== DATABASE TYPES ====================
export type CreateSessionParticipantDB = {
  session_id: string;
  user_id: string;
  status: ParticipantStatus;
  unique_link: string;
  link_expires_at: Date;
  invitation_sent_at?: Date | null;
};

export type UpdateSessionParticipantDB = {
  status?: ParticipantStatus;
  registered_at?: Date | null;
  invitation_sent_at?: Date | null;
  unique_link?: string;
  link_expires_at?: Date | null;
};

// ==================== UTILITY FUNCTIONS ====================

// Generate unique participant link
export function generateParticipantUniqueLink(
  sessionCode: string,
  participantId: string,
  baseUrl: string = ""
): string {
  const linkToken = `${sessionCode}-${participantId}-${Date.now()}`;
  // Use btoa instead of Buffer for Cloudflare Workers compatibility
  const encodedToken = btoa(linkToken)
    .replace(/[+/]/g, (match) => (match === "+" ? "-" : "_"))
    .replace(/=+$/, "");
  return `${baseUrl}/psikotes/${sessionCode}?token=${encodedToken}`;
}

// Check if participant link is expired
export function isParticipantLinkExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// Generate random unique link token
export function generateUniqueParticipantToken(): string {
  // Generate random token using crypto.getRandomValues
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Alternative token generator using timestamp + random
export function generateAlternativeParticipantToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`.toUpperCase();
}

// ==================== CONSTANTS ====================
export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  invited: "Invited",
  registered: "Registered",
  started: "Started",
  completed: "Completed",
  no_show: "No Show",
};

export const PARTICIPANT_STATUS_COLORS: Record<ParticipantStatus, string> = {
  invited: "bg-blue-100 text-blue-800",
  registered: "bg-green-100 text-green-800",
  started: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800",
  no_show: "bg-red-100 text-red-800",
};

// Default link expiry options (in hours)
export const PARTICIPANT_LINK_EXPIRY_OPTIONS = [
  { label: "1 Hour", hours: 1 },
  { label: "6 Hours", hours: 6 },
  { label: "12 Hours", hours: 12 },
  { label: "1 Day", hours: 24 },
  { label: "2 Days", hours: 48 },
  { label: "3 Days", hours: 72 },
  { label: "1 Week", hours: 168 },
];
