import { Context } from "hono";
import { eq, and, desc, count, sql, avg, gte, lte } from "drizzle-orm";
import {
  getDbFromEnv,
  testSessions,
  sessionParticipants,
  testAttempts,
  testResults,
  tests,
  users,
  sessionModules,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type ReportErrorResponse,
  calculateCompletionRate,
} from "shared-types";
import {
  calculateFreshScoresForSession,
  groupFreshScoresByUser,
  calculateUserAverageFromFreshScores,
} from "@/lib/reportCalculations";

export async function getSessionExportDataHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const { sessionId } = c.req.param();
    const rawQuery = c.req.query();

    // Parse query parameters for filtering
    const filters = {
      dateFrom: rawQuery.date_from ? new Date(rawQuery.date_from) : null,
      dateTo: rawQuery.date_to ? new Date(rawQuery.date_to) : null,
      status: rawQuery.status || null,
      period: rawQuery.period || null,
    };

    // Get session information
    const [session] = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        target_position: testSessions.target_position,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        location: testSessions.location,
        description: testSessions.description,
        status: testSessions.status,
        max_participants: testSessions.max_participants,
        current_participants: testSessions.current_participants,
        created_at: testSessions.created_at,
      })
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .limit(1);

    if (!session) {
      const errorResponse: ReportErrorResponse = {
        success: false,
        message: "Session not found",
        errors: [
          {
            field: "session_id",
            message: "Session with the provided ID does not exist",
            code: "NOT_FOUND",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Build participant query with filters
    let participantQuery = db
      .select({
        participant_id: sessionParticipants.participant_id,
        user_name: users.name,
        user_email: users.email,
        user_nik: users.nik,
        user_position: users.position,
        joined_at: sessionParticipants.joined_at,
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.participant_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId));

    // Apply filters
    const conditions = [eq(sessionParticipants.session_id, sessionId)];

    if (filters.dateFrom) {
      conditions.push(gte(sessionParticipants.joined_at, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(sessionParticipants.joined_at, filters.dateTo));
    }
    if (filters.status) {
      conditions.push(eq(sessionParticipants.status, filters.status as any));
    }

    const participants = await db
      .select({
        participant_id: sessionParticipants.participant_id,
        user_name: users.name,
        user_email: users.email,
        user_nik: users.nik,
        user_position: users.position,
        joined_at: sessionParticipants.joined_at,
        status: sessionParticipants.status,
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.participant_id, users.id))
      .where(and(...conditions));

    // Get test attempts and results for participants
    const participantIds = participants.map((p) => p.participant_id);
    
    let participantScores: any[] = [];
    let participantStatuses: any[] = [];

    if (participantIds.length > 0) {
      // Get latest test attempts for each participant
      const attempts = await db
        .select({
          participant_id: testAttempts.participant_id,
          test_id: testAttempts.test_id,
          status: testAttempts.status,
          started_at: testAttempts.started_at,
          completed_at: testAttempts.completed_at,
        })
        .from(testAttempts)
        .innerJoin(sessionModules, eq(testAttempts.test_id, sessionModules.test_id))
        .where(
          and(
            eq(sessionModules.session_id, sessionId),
            sql`${testAttempts.participant_id} = ANY(${participantIds})`
          )
        );

      // Calculate fresh scores for the session
      const freshScores = await calculateFreshScoresForSession(db, sessionId);
      const userScores = groupFreshScoresByUser(freshScores);
      
      participantScores = participantIds.map((participantId) => {
        const userFreshScores = userScores[participantId] || [];
        const averageScore = calculateUserAverageFromFreshScores(userFreshScores);
        return {
          participant_id: participantId,
          overall_score: averageScore,
        };
      });

      // Calculate completion status for each participant
      participantStatuses = participantIds.map((participantId) => {
        const userAttempts = attempts.filter((a) => a.participant_id === participantId);
        const completedAttempts = userAttempts.filter((a) => a.status === "completed");
        const totalTests = userAttempts.length;
        
        let status = "not_started";
        if (completedAttempts.length === totalTests && totalTests > 0) {
          status = "completed";
        } else if (completedAttempts.length > 0) {
          status = "in_progress";
        }

        return {
          participant_id: participantId,
          status,
          completion_rate: totalTests > 0 ? (completedAttempts.length / totalTests) * 100 : 0,
          last_test_date: completedAttempts.length > 0 
            ? Math.max(...completedAttempts.map(a => new Date(a.completed_at!).getTime()))
            : null,
        };
      });
    }

    // Combine participant data
    const participantData = participants.map((participant) => {
      const score = participantScores.find((s) => s.participant_id === participant.participant_id);
      const statusInfo = participantStatuses.find((s) => s.participant_id === participant.participant_id);
      
      return {
        name: participant.user_name,
        email: participant.user_email,
        nik: participant.user_nik,
        position: participant.user_position,
        overall_score: score?.overall_score || 0,
        completion_rate: statusInfo?.completion_rate || 0,
        status: statusInfo?.status || "not_started",
        last_test_date: statusInfo?.last_test_date 
          ? new Date(statusInfo.last_test_date).toISOString()
          : null,
      };
    });

    // Calculate statistics
    const completedParticipants = participantData.filter((p) => p.status === "completed");
    const totalParticipants = participantData.length;
    const averageScore = completedParticipants.length > 0 
      ? completedParticipants.reduce((sum, p) => sum + p.overall_score, 0) / completedParticipants.length
      : 0;
    const overallCompletionRate = totalParticipants > 0 
      ? (completedParticipants.length / totalParticipants) * 100
      : 0;

    const exportData = {
      session: {
        session_name: session.session_name,
        session_code: session.session_code,
        start_time: session.start_time,
        end_time: session.end_time,
        target_position: session.target_position,
        total_participants: totalParticipants,
      },
      participants: participantData,
      statistics: {
        total_participants: totalParticipants,
        completed_tests: completedParticipants.length,
        average_score: averageScore,
        completion_rate: overallCompletionRate,
      },
      filters: {
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
        status: filters.status,
        period: filters.period,
      },
    };

    const response = {
      success: true,
      message: "Session export data retrieved successfully",
      data: exportData,
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session export data:", error);
    const errorResponse: ReportErrorResponse = {
      success: false,
      message: "Failed to retrieve session export data",
      timestamp: new Date().toISOString(),
    };
    return c.json(errorResponse, 500);
  }
}