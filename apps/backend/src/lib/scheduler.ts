// apps/backend/src/lib/scheduler.ts
import {
  eq,
  and,
  sql,
  lt,
  gte,
  sum,
  avg,
  count,
  min,
  max,
  desc,
} from "drizzle-orm";
import {
  createDatabase,
  testSessions,
  users,
  testResults,
  testAttempts,
  userPerformanceStats,
  authSessions,
} from "../db";
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

// Update user performance stats job
export async function updateUserPerformanceStatsJob(env: CloudflareBindings) {
  console.log("📊 Running user performance stats update job...");

  try {
    const validatedEnv = validateEnv(env);
    const db = createDatabase(validatedEnv.DATABASE_URL || "");

    const now = new Date();

    // Get all users with role 'participant' who have test results
    const userStats = await db
      .select({
        user_id: users.id,
        total_tests_taken: count(testAttempts.id),
        total_tests_completed: sql<number>`COUNT(CASE WHEN ${testAttempts.status} = 'completed' THEN 1 END)::int`,
        average_raw_score: avg(testResults.raw_score),
        average_scaled_score: avg(testResults.scaled_score),
        highest_raw_score: max(testResults.raw_score),
        lowest_raw_score: min(testResults.raw_score),
        highest_scaled_score: max(testResults.scaled_score),
        lowest_scaled_score: min(testResults.scaled_score),
        total_time_spent: sum(testAttempts.time_spent),
        last_test_date: sql<Date>`MAX(${testAttempts.created_at})`,
      })
      .from(users)
      .leftJoin(testAttempts, eq(users.id, testAttempts.user_id))
      .leftJoin(testResults, eq(testAttempts.id, testResults.attempt_id))
      .where(eq(users.role, "participant"))
      .groupBy(users.id)
      .having(sql`COUNT(${testAttempts.id}) > 0`);

    console.log(`📋 Found ${userStats.length} users with test data to update`);

    if (userStats.length === 0) {
      console.log("✅ No user performance stats to update");
      return { success: true, updated_count: 0 };
    }

    // Calculate additional metrics for each user
    const enrichedStats = userStats.map((stat) => {
      const totalTests = Number(stat.total_tests_taken) || 0;
      const completedTests = Number(stat.total_tests_completed) || 0;
      const totalTimeSpent = Number(stat.total_time_spent) || 0;

      const completionRate =
        totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
      const averageTimePerTest =
        completedTests > 0 ? Math.round(totalTimeSpent / completedTests) : 0;

      // Calculate consistency score based on score variance
      const avgRaw = Number(stat.average_raw_score) || 0;
      const highRaw = Number(stat.highest_raw_score) || 0;
      const lowRaw = Number(stat.lowest_raw_score) || 0;

      // Simple consistency score: lower variance = higher consistency
      const scoreRange = highRaw - lowRaw;
      const consistencyScore =
        avgRaw > 0 ? Math.max(0, 100 - (scoreRange / avgRaw) * 100) : 0;

      return {
        user_id: stat.user_id,
        total_tests_taken: totalTests,
        total_tests_completed: completedTests,
        average_raw_score: stat.average_raw_score,
        average_scaled_score: stat.average_scaled_score,
        highest_raw_score: stat.highest_raw_score,
        lowest_raw_score: stat.lowest_raw_score,
        highest_scaled_score: stat.highest_scaled_score,
        lowest_scaled_score: stat.lowest_scaled_score,
        total_time_spent: totalTimeSpent,
        average_time_per_test: averageTimePerTest,
        completion_rate: (Math.round(completionRate * 100) / 100).toString(),
        consistency_score: (Math.round(consistencyScore * 100) / 100).toString(),
        last_test_date: stat.last_test_date,
        calculation_date: now,
        updated_at: now,
      };
    });

    // Sort by average_raw_score to calculate ranks
    const sortedStats = [...enrichedStats].sort(
      (a, b) =>
        Number(b.average_raw_score || 0) - Number(a.average_raw_score || 0)
    );

    // Add ranks and percentiles
    const finalStats = sortedStats.map((stat, index) => {
      const rank = index + 1;
      const percentile =
        ((sortedStats.length - rank) / sortedStats.length) * 100;

      return {
        ...stat,
        performance_rank: rank,
        performance_percentile: (Math.round(percentile * 100) / 100).toString(),
      };
    });

    // Clear existing stats and insert new ones
    await db.delete(userPerformanceStats);

    // Insert new stats in batches to avoid query size limits
    const batchSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < finalStats.length; i += batchSize) {
      const batch = finalStats.slice(i, i + batchSize);

      const insertData = batch.map((stat) => ({
        user_id: stat.user_id,
        total_tests_taken: stat.total_tests_taken,
        total_tests_completed: stat.total_tests_completed,
        average_raw_score: stat.average_raw_score,
        average_scaled_score: stat.average_scaled_score,
        highest_raw_score: stat.highest_raw_score,
        lowest_raw_score: stat.lowest_raw_score,
        highest_scaled_score: stat.highest_scaled_score,
        lowest_scaled_score: stat.lowest_scaled_score,
        total_time_spent: stat.total_time_spent,
        average_time_per_test: stat.average_time_per_test,
        completion_rate: stat.completion_rate,
        consistency_score: stat.consistency_score,
        performance_rank: stat.performance_rank,
        performance_percentile: stat.performance_percentile,
        last_test_date: stat.last_test_date,
        calculation_date: stat.calculation_date,
        created_at: now,
        updated_at: stat.updated_at,
      }));

      await db.insert(userPerformanceStats).values(insertData);

      updatedCount += batch.length;
      console.log(
        `📊 Updated performance stats for ${updatedCount}/${finalStats.length} users`
      );
    }

    console.log(
      `✅ Successfully updated performance stats for ${updatedCount} users`
    );

    return {
      success: true,
      updated_count: updatedCount,
      total_users: finalStats.length,
      calculation_time: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Error in user performance stats update job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Auth sessions cleanup job
export async function cleanupExpiredAuthSessionsJob(env: CloudflareBindings) {
  console.log("🧹 Running expired auth sessions cleanup job...");

  try {
    const validatedEnv = validateEnv(env);
    const db = createDatabase(validatedEnv.DATABASE_URL || "");

    const now = new Date();

    // Find expired auth sessions
    const expiredSessions = await db
      .select({
        id: authSessions.id,
        user_id: authSessions.user_id,
        expires_at: authSessions.expires_at,
      })
      .from(authSessions)
      .where(lt(authSessions.expires_at, now));

    if (expiredSessions.length === 0) {
      console.log("✅ No expired auth sessions to clean up");
      return { success: true, cleaned_count: 0 };
    }

    console.log(`🗑️ Found ${expiredSessions.length} expired auth sessions to clean up`);

    // Delete expired sessions
    const deleteResult = await db
      .delete(authSessions)
      .where(lt(authSessions.expires_at, now))
      .returning({ id: authSessions.id });

    console.log(`✅ Successfully cleaned up ${deleteResult.length} expired auth sessions`);

    return {
      success: true,
      cleaned_count: deleteResult.length,
    };
  } catch (error) {
    console.error("❌ Error in auth sessions cleanup job:", error);
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
    auth_session_cleanup: await cleanupExpiredAuthSessionsJob(env),
    user_performance_stats: await updateUserPerformanceStatsJob(env),
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
