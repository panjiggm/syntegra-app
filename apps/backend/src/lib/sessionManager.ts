import { eq, and, lt, desc, sql } from "drizzle-orm";
import { authSessions, users, type Database } from "../db";
import { AUTH_CONSTANTS } from "shared-types";

export class SessionManager {
  constructor(private db: Database) {}

  /**
   * Clean up expired sessions for all users
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.db
        .delete(authSessions)
        .where(lt(authSessions.expires_at, new Date()));

      console.log(`Cleaned up expired sessions`);
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      return 0;
    }
  }

  /**
   * Clean up inactive sessions (not used for more than 30 days)
   */
  async cleanupInactiveSessions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.db
        .delete(authSessions)
        .where(lt(authSessions.last_used, thirtyDaysAgo));

      console.log(`Cleaned up inactive sessions`);
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error cleaning up inactive sessions:", error);
      return 0;
    }
  }

  /**
   * Limit active sessions per user (keep only the most recent N sessions)
   */
  async limitUserSessions(
    userId: string,
    maxSessions: number = AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER
  ): Promise<void> {
    try {
      // Get all active sessions for user, ordered by last_used desc
      const allSessions = await this.db
        .select({
          id: authSessions.id,
          last_used: authSessions.last_used,
        })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.user_id, userId),
            eq(authSessions.is_active, true),
            // Only consider non-expired sessions
            sql`${authSessions.expires_at} > NOW()`
          )
        )
        .orderBy(desc(authSessions.last_used));

      // If user has more than maxSessions, delete the oldest ones
      if (allSessions.length > maxSessions) {
        const sessionsToDelete = allSessions.slice(maxSessions);
        const sessionIdsToDelete = sessionsToDelete.map((s) => s.id);

        await this.db
          .delete(authSessions)
          .where(
            and(
              eq(authSessions.user_id, userId),
              sql`${authSessions.id} = ANY(${sessionIdsToDelete})`
            )
          );

        console.log(
          `Deleted ${sessionIdsToDelete.length} old sessions for user ${userId}`
        );
      }
    } catch (error) {
      console.error(`Error limiting sessions for user ${userId}:`, error);
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string) {
    try {
      return await this.db
        .select({
          id: authSessions.id,
          ip_address: authSessions.ip_address,
          user_agent: authSessions.user_agent,
          created_at: authSessions.created_at,
          last_used: authSessions.last_used,
          expires_at: authSessions.expires_at,
        })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.user_id, userId),
            eq(authSessions.is_active, true),
            sql`${authSessions.expires_at} > NOW()`
          )
        )
        .orderBy(desc(authSessions.last_used));
    } catch (error) {
      console.error(`Error getting active sessions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      const conditions = [eq(authSessions.id, sessionId)];
      if (userId) {
        conditions.push(eq(authSessions.user_id, userId));
      }

      const result = await this.db
        .update(authSessions)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(and(...conditions));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error revoking session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeOtherUserSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    try {
      const result = await this.db
        .update(authSessions)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(authSessions.user_id, userId),
            sql`${authSessions.id} != ${currentSessionId}`,
            eq(authSessions.is_active, true)
          )
        );

      return result.rowCount || 0;
    } catch (error) {
      console.error(`Error revoking other sessions for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      const [totalSessions] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(authSessions);

      const [activeSessions] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.is_active, true),
            sql`${authSessions.expires_at} > NOW()`
          )
        );

      const [expiredSessions] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(authSessions)
        .where(lt(authSessions.expires_at, new Date()));

      return {
        total: totalSessions.count,
        active: activeSessions.count,
        expired: expiredSessions.count,
      };
    } catch (error) {
      console.error("Error getting session stats:", error);
      return {
        total: 0,
        active: 0,
        expired: 0,
      };
    }
  }

  /**
   * Comprehensive cleanup - run this periodically
   */
  async performMaintenanceCleanup(): Promise<{
    expiredCleaned: number;
    inactiveCleaned: number;
    sessionStats: {
      total: number;
      active: number;
      expired: number;
    };
  }> {
    console.log("Starting session maintenance cleanup...");

    const expiredCleaned = await this.cleanupExpiredSessions();
    const inactiveCleaned = await this.cleanupInactiveSessions();
    const sessionStats = await this.getSessionStats();

    console.log(`Session maintenance completed:
      - Expired sessions cleaned: ${expiredCleaned}
      - Inactive sessions cleaned: ${inactiveCleaned}
      - Current stats: ${JSON.stringify(sessionStats)}
    `);

    return {
      expiredCleaned,
      inactiveCleaned,
      sessionStats,
    };
  }
}

// Helper function to create session manager instance
export function createSessionManager(db: Database): SessionManager {
  return new SessionManager(db);
}

// Utility function to be called during login to manage user sessions
export async function manageUserLoginSessions(
  db: Database,
  userId: string,
  maxSessions: number = AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER
): Promise<void> {
  const sessionManager = createSessionManager(db);
  await sessionManager.limitUserSessions(userId, maxSessions);
}
