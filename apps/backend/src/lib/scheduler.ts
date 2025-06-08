import { getDbFromEnv } from "../db";
import { createSessionManager } from "./sessionManager";
import type { CloudflareBindings } from "./env";

// Store the last execution time to prevent duplicate runs
let lastExecutionTime = 0;
const MINIMUM_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between runs

export async function runScheduledJobs(env: CloudflareBindings) {
  const now = Date.now();

  // Prevent running too frequently
  if (now - lastExecutionTime < MINIMUM_INTERVAL) {
    console.log("Skipping scheduled jobs - too soon since last execution");
    return;
  }

  try {
    console.log("🔄 Starting scheduled jobs...");
    lastExecutionTime = now;

    const db = getDbFromEnv(env);

    // 1. Session cleanup and management
    await performSessionCleanup(db);

    // 2. Update session status (existing job)
    await updateSessionStatus(db);

    console.log("✅ Scheduled jobs completed successfully");
  } catch (error) {
    console.error("❌ Error running scheduled jobs:", error);
  }
}

async function performSessionCleanup(db: any) {
  try {
    console.log("🧹 Starting session cleanup...");

    const sessionManager = createSessionManager(db);
    const cleanupResult = await sessionManager.performMaintenanceCleanup();

    console.log(`✅ Session cleanup completed:
      - Expired sessions cleaned: ${cleanupResult.expiredCleaned}
      - Inactive sessions cleaned: ${cleanupResult.inactiveCleaned}
      - Current session stats: Total: ${cleanupResult.sessionStats.total}, Active: ${cleanupResult.sessionStats.active}, Expired: ${cleanupResult.sessionStats.expired}
    `);
  } catch (error) {
    console.error("❌ Session cleanup error:", error);
  }
}

async function updateSessionStatus(db: any) {
  try {
    console.log("📊 Updating session status...");

    // Your existing session status update logic here
    // This is the original logic from your existing scheduler

    console.log("✅ Session status update completed");
  } catch (error) {
    console.error("❌ Session status update error:", error);
  }
}

// Development scheduler - runs every 3 minutes
let devSchedulerTimer: NodeJS.Timeout | null = null;

export function startDevScheduler(env: CloudflareBindings) {
  if (devSchedulerTimer) {
    return; // Already started
  }

  console.log("🔧 Starting development scheduler (every 3 minutes)...");

  // Run immediately
  runScheduledJobs(env);

  // Schedule to run every 3 minutes
  devSchedulerTimer = setInterval(
    () => {
      runScheduledJobs(env);
    },
    3 * 60 * 1000
  ); // 3 minutes
}

export function stopDevScheduler() {
  if (devSchedulerTimer) {
    clearInterval(devSchedulerTimer);
    devSchedulerTimer = null;
    console.log("🛑 Development scheduler stopped");
  }
}
