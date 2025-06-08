import { Context } from "hono";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  users,
  isDatabaseConfigured,
} from "@/db";
import { getEnv, type CloudflareBindings } from "@/lib/env";
import {
  type GetSessionParticipantsRequest,
  type GetSessionByIdRequest,
  type GetSessionParticipantsResponse,
  type SessionErrorResponse,
  generateParticipantUniqueLink,
  isParticipantLinkExpired,
} from "shared-types";

export async function getSessionParticipantsHandler(
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

    // Get path parameters and query parameters
    const { sessionId } = c.req.param() as GetSessionByIdRequest;
    const query = c.req.query() as any as GetSessionParticipantsRequest;

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
            message: "Only admin users can view session participants",
            code: "ACCESS_DENIED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    // Find session and validate it exists
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        status: testSessions.status,
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

    // Build where conditions for participants
    const whereConditions = [eq(sessionParticipants.session_id, sessionId)];

    // Search filter
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      whereConditions.push(
        sql`(
          ${users.name} ILIKE ${searchTerm} OR
          ${users.nik} ILIKE ${searchTerm} OR
          ${users.email} ILIKE ${searchTerm}
        )`
      );
    }

    // Status filter
    if (query.status) {
      whereConditions.push(eq(sessionParticipants.status, query.status));
    }

    // Invitation sent filter
    if (query.invitation_sent !== undefined) {
      if (query.invitation_sent) {
        whereConditions.push(
          sql`${sessionParticipants.invitation_sent_at} IS NOT NULL`
        );
      } else {
        whereConditions.push(
          sql`${sessionParticipants.invitation_sent_at} IS NULL`
        );
      }
    }

    // Registered filter
    if (query.registered !== undefined) {
      if (query.registered) {
        whereConditions.push(
          sql`${sessionParticipants.registered_at} IS NOT NULL`
        );
      } else {
        whereConditions.push(sql`${sessionParticipants.registered_at} IS NULL`);
      }
    }

    // Combine where conditions
    const whereClause = and(...whereConditions);

    // Build order by clause
    const orderByField = (() => {
      switch (query.sort_by) {
        case "name":
          return users.name;
        case "nik":
          return users.nik;
        case "email":
          return users.email;
        case "status":
          return sessionParticipants.status;
        case "registered_at":
          return sessionParticipants.registered_at;
        case "invitation_sent_at":
          return sessionParticipants.invitation_sent_at;
        case "created_at":
          return sessionParticipants.created_at;
        default:
          return sessionParticipants.created_at;
      }
    })();

    const orderByClause =
      query.sort_order === "asc" ? asc(orderByField) : desc(orderByField);

    // Get total count for pagination
    const [totalCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(whereClause);

    const total = totalCount?.count || 0;
    const totalPages = Math.ceil(total / query.limit);
    const hasNextPage = query.page < totalPages;
    const hasPrevPage = query.page > 1;

    // Get participants with pagination
    const participants = await db
      .select({
        // Participant data
        participant_id: sessionParticipants.id,
        session_id: sessionParticipants.session_id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        registered_at: sessionParticipants.registered_at,
        invitation_sent_at: sessionParticipants.invitation_sent_at,
        unique_link: sessionParticipants.unique_link,
        link_expires_at: sessionParticipants.link_expires_at,
        participant_created_at: sessionParticipants.created_at,

        // User data
        user_id_ref: users.id,
        user_nik: users.nik || "",
        user_name: users.name,
        user_email: users.email,
        user_phone: users.phone,
        user_gender: users.gender,
        user_birth_date: users.birth_date,
        user_is_active: users.is_active,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    // Transform participants data for response
    const participantsWithDetails = participants.map((participant) => {
      // Generate access URL for participant
      const accessUrl = generateParticipantUniqueLink(
        session.session_code,
        participant.participant_id,
        env.FRONTEND_URL
      );

      // Check if link is expired
      const linkExpired = participant.link_expires_at
        ? isParticipantLinkExpired(participant.link_expires_at)
        : false;

      return {
        id: participant.participant_id,
        session_id: participant.session_id,
        user_id: participant.user_id,
        status: participant.status as any,
        registered_at: participant.registered_at,
        invitation_sent_at: participant.invitation_sent_at,
        unique_link: participant.unique_link,
        link_expires_at: participant.link_expires_at,
        created_at: participant.participant_created_at,
        user: {
          id: participant.user_id_ref,
          nik: participant.user_nik || "",
          name: participant.user_name,
          email: participant.user_email,
          phone: participant.user_phone,
          gender: participant.user_gender,
          birth_date: participant.user_birth_date,
          is_active: participant.user_is_active ?? false,
        },
        is_link_expired: linkExpired,
        access_url: accessUrl,
      };
    });

    // Get filter options for response
    const uniqueStatuses = await db
      .selectDistinct({
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          sql`${sessionParticipants.status} IS NOT NULL`
        )
      );

    // Prepare pagination meta
    const paginationMeta = {
      current_page: query.page,
      per_page: query.limit,
      total,
      total_pages: totalPages,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
    };

    // Prepare session info
    const sessionInfo = {
      id: session.id,
      session_name: session.session_name,
      session_code: session.session_code,
      target_position: session.target_position || "",
      max_participants: session.max_participants,
      current_participants: session.current_participants ?? 0,
      status: (session.status || "draft") as any,
    };

    // Prepare filter options
    const filterOptions = {
      statuses: uniqueStatuses.map((s: any) => s.status || "invited"),
    };

    const response: GetSessionParticipantsResponse = {
      success: true,
      message: `Found ${total} participant(s) for session '${session.session_name}'`,
      data: participantsWithDetails,
      meta: paginationMeta,
      session_info: sessionInfo,
      filters: filterOptions,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `✅ Session participants retrieved by admin ${auth.user.email}: ${participants.length} participants for session ${session.session_name} (${session.session_code}) - page ${query.page}/${totalPages}`
    );

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session participants:", error);

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

      // Handle invalid UUID errors
      if (error.message.includes("invalid input syntax for type uuid")) {
        const errorResponse: SessionErrorResponse = {
          success: false,
          message: "Invalid session ID format",
          errors: [
            {
              field: "sessionId",
              message: "Session ID must be a valid UUID",
              code: "INVALID_UUID",
            },
          ],
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 400);
      }
    }

    // Generic error response
    const errorResponse: SessionErrorResponse = {
      success: false,
      message: "Failed to retrieve session participants",
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
