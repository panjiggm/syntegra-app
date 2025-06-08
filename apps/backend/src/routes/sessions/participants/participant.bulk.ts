import { Context } from "hono";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type BulkAddParticipantsToSessionRequest,
  type AddParticipantToSessionByIdRequest,
  type BulkAddParticipantsToSessionResponse,
  type SessionErrorResponse,
  type CreateSessionParticipantDB,
  generateUniqueParticipantToken,
  generateParticipantUniqueLink,
  isParticipantLinkExpired,
  isSessionExpired,
} from "shared-types";

export async function bulkAddParticipantsToSessionHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message:
              "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get path parameters and request data
    const { sessionId } = c.req.param() as AddParticipantToSessionByIdRequest;
    const data = (await c.req.json()) as BulkAddParticipantsToSessionRequest;

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Get authenticated admin user
    const auth = c.get("auth");
    if (!auth || auth.user.role !== "admin") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only admin users can add participants to test sessions",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find session by ID and validate
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        target_position: testSessions.target_position,
        allow_late_entry: testSessions.allow_late_entry,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    // Check if session exists
    if (!session) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "sessionId",
            message: `Test session with ID "${sessionId}" not found`,
            code: "SESSION_NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Check if session can accept new participants
    if (session.status === "cancelled") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participants to cancelled session",
        errors: [
          {
            field: "session_status",
            message: "This session has been cancelled",
            code: "SESSION_CANCELLED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    if (session.status === "completed") {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participants to completed session",
        errors: [
          {
            field: "session_status",
            message: "This session has been completed",
            code: "SESSION_COMPLETED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Check if session is expired
    const sessionExpired = isSessionExpired({
      end_time: session.end_time,
      status: session.status || "draft",
    });

    if (sessionExpired) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Cannot add participants to expired session",
        errors: [
          {
            field: "session_status",
            message: "This session has expired",
            code: "SESSION_EXPIRED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Get user IDs from request
    const userIds = data.participants.map((p) => p.user_id);

    // Validate users exist and are participants
    const validUsers = await db
      .select({
        id: users.id,
        nik: users.nik || "",
        name: users.name,
        email: users.email,
        phone: users.phone,
        gender: users.gender,
        birth_date: users.birth_date,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(and(inArray(users.id, userIds), eq(users.role, "participant")));

    const validUserIds = validUsers.map((user) => user.id);
    const invalidUserIds = userIds.filter((id) => !validUserIds.includes(id));

    // Check for inactive users
    const inactiveUsers = validUsers.filter((user) => !user.is_active);

    // Check existing participants
    const existingParticipants = await db
      .select({
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          inArray(sessionParticipants.user_id, validUserIds)
        )
      );

    const existingUserIds = existingParticipants.map((p) => p.user_id);

    // Calculate available slots
    const currentCount = session.current_participants || 0;
    const maxParticipants = session.max_participants;
    const availableSlots = maxParticipants
      ? maxParticipants - currentCount
      : null;

    // Filter users to add (excluding invalid, inactive, and existing)
    const usersToAdd = validUsers.filter(
      (user) =>
        !inactiveUsers.some((inactive) => inactive.id === user.id) &&
        !existingUserIds.includes(user.id)
    );

    // Check if adding would exceed max participants
    if (availableSlots !== null && usersToAdd.length > availableSlots) {
      const errorResponse: SessionErrorResponse = {
        success: false,
        message: "Would exceed maximum participants",
        errors: [
          {
            field: "participants",
            message: `Cannot add ${usersToAdd.length} participants. Only ${availableSlots} slots available.`,
            code: "EXCEEDS_MAX_PARTICIPANTS",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 409);
    }

    // Prepare skipped participants info
    const skippedParticipants = [];

    // Add invalid users to skipped
    for (const invalidId of invalidUserIds) {
      skippedParticipants.push({
        user_id: invalidId,
        user_name: "Unknown User",
        reason: "User not found or not a participant",
      });
    }

    // Add inactive users to skipped
    for (const inactiveUser of inactiveUsers) {
      skippedParticipants.push({
        user_id: inactiveUser.id,
        user_name: inactiveUser.name,
        reason: "User is inactive",
      });
    }

    // Add existing users to skipped
    for (const existingUserId of existingUserIds) {
      const existingUser = validUsers.find((u) => u.id === existingUserId);
      const existingParticipant = existingParticipants.find(
        (p) => p.user_id === existingUserId
      );
      skippedParticipants.push({
        user_id: existingUserId,
        user_name: existingUser?.name || "Unknown",
        reason: `Already a participant with status: ${existingParticipant?.status}`,
      });
    }

    // Generate link expiry time
    const linkExpiresAt = new Date();
    linkExpiresAt.setHours(linkExpiresAt.getHours() + data.link_expires_hours);

    // Prepare participant data to insert
    const participantsData: CreateSessionParticipantDB[] = usersToAdd.map(
      (user) => ({
        session_id: sessionId,
        user_id: user.id,
        status: "invited" as const,
        unique_link: generateUniqueParticipantToken(),
        link_expires_at: linkExpiresAt,
        invitation_sent_at: data.send_invitations ? new Date() : null,
      })
    );

    // Insert participants into database
    let addedParticipants: any[] = [];
    if (participantsData.length > 0) {
      addedParticipants = await db
        .insert(sessionParticipants)
        .values(participantsData)
        .returning();

      // Update session current_participants count
      await db
        .update(testSessions)
        .set({
          current_participants: sql`${testSessions.current_participants} + ${addedParticipants.length}`,
          updated_at: new Date(),
        })
        .where(eq(testSessions.id, sessionId));
    }

    // Prepare response data
    const addedParticipantsWithDetails = addedParticipants.map(
      (participant) => {
        const user = usersToAdd.find((u) => u.id === participant.user_id)!;
        const accessUrl = generateParticipantUniqueLink(
          session.session_code,
          participant.id,
          env.FRONTEND_URL
        );
        const linkExpired = isParticipantLinkExpired(
          participant.link_expires_at
        );

        return {
          id: participant.id,
          session_id: participant.session_id,
          user_id: participant.user_id,
          status: participant.status as any,
          registered_at: participant.registered_at,
          invitation_sent_at: participant.invitation_sent_at,
          unique_link: participant.unique_link,
          link_expires_at: participant.link_expires_at,
          created_at: participant.created_at,
          user: {
            id: user.id,
            nik: user.nik || "",
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            birth_date: user.birth_date,
            is_active: user.is_active ?? false,
          },
          is_link_expired: linkExpired,
          access_url: accessUrl,
        };
      }
    );

    // Prepare invitation status
    const invitationStatus = data.send_invitations
      ? {
          sent: addedParticipants.length, // In real implementation, count actual sent invitations
          failed: 0, // Count failed invitations
          skipped: skippedParticipants.length,
        }
      : undefined;

    const response: BulkAddParticipantsToSessionResponse = {
      success: true,
      message: `Successfully added ${addedParticipants.length} participant(s) to session '${session.session_name}'${skippedParticipants.length > 0 ? ` (${skippedParticipants.length} skipped)` : ""}`,
      data: {
        added_participants: addedParticipantsWithDetails,
        total_added: addedParticipants.length,
        skipped_participants:
          skippedParticipants.length > 0 ? skippedParticipants : undefined,
        invitation_status: invitationStatus,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Bulk participants added by admin ${auth.user.email}: ${addedParticipants.length} added to session ${session.session_name} (${session.session_code}), ${skippedParticipants.length} skipped`
    );

    // TODO: If send_invitations is true, trigger bulk email/notification sending
    if (data.send_invitations && addedParticipants.length > 0) {
      console.log(
        `📧 Bulk invitations should be sent to ${addedParticipants.length} participants for session ${session.session_code}`
      );
      // Implementation for bulk sending invitations would go here
    }

    return c.json(response, 201);
  } catch (error) {
    console.error("Error bulk adding participants to session:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }

      // Handle unique constraint violations (some participants might already exist)
      if (
        error.message.includes("unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Some participants already exist in session",
          errors: [
            {
              field: "participants",
              message: "One or more participants are already in this session",
              code: "DUPLICATE_PARTICIPANTS",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 409);
      }
    }

    // Generic error response
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to bulk add participants to session",
      ...(env.NODE_ENV === "development" && {
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
