// apps/backend/src/lib/scheduler.ts
import { eq, and, sql, lt } from "drizzle-orm";
import { createDatabase, testSessions } from "../db";
import { validateEnv, type CloudflareBindings } from "./env";

// Session status update job
export async function updateExpiredSessionsJob(env: CloudflareBindings) {
  console.log("🔄 Running session status update job...");

  try {
    // Validate environment and create database connection
    const validatedEnv = validateEnv(env);
    const db = createDatabase(validatedEnv.DATABASE_URL || "");

    const now = new Date();

    // Find active sessions that have passed their end_time
    const expiredSessions = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        end_time: testSessions.end_time,
        status: testSessions.status,
      })
      .from(testSessions)
      .where(
        and(
          eq(testSessions.status, "active"),
          lt(testSessions.end_time, now),
          eq(testSessions.auto_expire, true) // Only auto-expire sessions that have auto_expire enabled
        )
      );

    if (expiredSessions.length === 0) {
      console.log("✅ No sessions to expire");
      return { success: true, expired_count: 0 };
    }

    console.log(
      `📋 Found ${expiredSessions.length} sessions to expire:`,
      expiredSessions.map((s) => `${s.session_name} (${s.session_code})`)
    );

    // Update sessions to expired status
    const sessionIds = expiredSessions.map((s) => s.id);

    const updateResult = await db
      .update(testSessions)
      .set({
        status: "expired",
        updated_at: now,
      })
      .where(
        and(
          sql`${testSessions.id} = ANY(${sessionIds})`,
          eq(testSessions.status, "active") // Double-check status to avoid race conditions
        )
      )
      .returning({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
      });

    console.log(
      `✅ Successfully expired ${updateResult.length} sessions:`,
      updateResult.map((s) => `${s.session_name} (${s.session_code})`)
    );

    return {
      success: true,
      expired_count: updateResult.length,
      expired_sessions: updateResult,
    };
  } catch (error) {
    console.error("❌ Error in session status update job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Auto-activate sessions that have reached their start_time
export async function autoActivateSessionsJob(env: CloudflareBindings) {
  console.log("🔄 Running session auto-activation job...");

  try {
    const validatedEnv = validateEnv(env);
    const db = createDatabase(validatedEnv.DATABASE_URL || "");

    const now = new Date();

    // Find draft sessions that should be activated (start_time has passed)
    const sessionsToActivate = await db
      .select({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
        start_time: testSessions.start_time,
        end_time: testSessions.end_time,
        status: testSessions.status,
      })
      .from(testSessions)
      .where(
        and(
          eq(testSessions.status, "draft"),
          lt(testSessions.start_time, now), // start_time has passed
          sql`${testSessions.end_time} > ${now}` // but end_time hasn't passed yet
        )
      );

    if (sessionsToActivate.length === 0) {
      console.log("✅ No sessions to activate");
      return { success: true, activated_count: 0 };
    }

    console.log(
      `📋 Found ${sessionsToActivate.length} sessions to activate:`,
      sessionsToActivate.map((s) => `${s.session_name} (${s.session_code})`)
    );

    // Update sessions to active status
    const sessionIds = sessionsToActivate.map((s) => s.id);

    const updateResult = await db
      .update(testSessions)
      .set({
        status: "active",
        updated_at: now,
      })
      .where(
        and(
          sql`${testSessions.id} = ANY(${sessionIds})`,
          eq(testSessions.status, "draft") // Double-check status
        )
      )
      .returning({
        id: testSessions.id,
        session_name: testSessions.session_name,
        session_code: testSessions.session_code,
      });

    console.log(
      `✅ Successfully activated ${updateResult.length} sessions:`,
      updateResult.map((s) => `${s.session_name} (${s.session_code})`)
    );

    return {
      success: true,
      activated_count: updateResult.length,
      activated_sessions: updateResult,
    };
  } catch (error) {
    console.error("❌ Error in session auto-activation job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Main scheduled jobs runner
export async function runScheduledJobs(env: CloudflareBindings) {
  console.log("⏰ Starting scheduled jobs execution...");

  const results = {
    session_expiry: await updateExpiredSessionsJob(env),
    session_activation: await autoActivateSessionsJob(env),
    timestamp: new Date().toISOString(),
  };

  console.log("📊 Scheduled jobs completed:", results);
  return results;
}

// Development scheduler (runs periodically in development)
let devSchedulerInterval: NodeJS.Timeout | null = null;

export function startDevScheduler(env: CloudflareBindings) {
  // Don't start if already running
  if (devSchedulerInterval) {
    console.log("🔧 Development scheduler already running");
    return;
  }

  console.log("🔧 Starting development scheduler (3-minute interval)...");

  // Run immediately once
  runScheduledJobs(env).catch(console.error);

  // Then run every 3 minutes
  devSchedulerInterval = setInterval(
    () => {
      runScheduledJobs(env).catch(console.error);
    },
    3 * 60 * 1000
  ); // 3 minutes

  // Clean up on process exit (for development)
  if (typeof process !== "undefined") {
    process.on("exit", () => {
      if (devSchedulerInterval) {
        clearInterval(devSchedulerInterval);
        devSchedulerInterval = null;
      }
    });
  }
}

export function stopDevScheduler() {
  if (devSchedulerInterval) {
    clearInterval(devSchedulerInterval);
    devSchedulerInterval = null;
    console.log("🛑 Development scheduler stopped");
  }
}
