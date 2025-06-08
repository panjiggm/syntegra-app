// apps/backend/src/index.ts
import { Hono } from "hono";
import { api } from "./routes/api";
import { startDevScheduler } from "./lib/scheduler";
import type { CloudflareBindings } from "./lib/env";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Start scheduler for session status auto-updates
// Only in development - production uses Cloudflare Cron Triggers
if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
  console.log("🔧 Development environment detected, starting scheduler...");
  // Note: Scheduler will start when first request is made due to Cloudflare Workers architecture
}

// Mount API routes
app.route("/api/v1", api);

// Root endpoint
app.get("/", (c) => {
  // Start scheduler on first request in development
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production"
  ) {
    startDevScheduler(c.env);
  }

  return c.json({
    success: true,
    message: "Syntegra Psikotes API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    scheduler: {
      enabled: true,
      interval: "3 minutes",
      jobs: ["session_status_updater"],
    },
    endpoints: {
      health: "/api/v1/health",
      auth: {
        login: "POST /api/v1/auth/login",
        logout: "POST /api/v1/auth/logout",
        refresh: "POST /api/v1/auth/refresh",
        me: "GET /api/v1/auth/me",
      },
      users: {
        create: "POST /api/v1/users",
        list: "GET /api/v1/users",
        get: "GET /api/v1/users/:id",
        details: "GET /api/v1/users/:id/details",
        update: "PUT /api/v1/users/:id",
        delete: "DELETE /api/v1/users/:id",
        schema: "GET /api/v1/users/schema",
        adminStatus: "GET /api/v1/users/admin-status",
        bulk: {
          validateCsv: "POST /api/v1/users/bulk/validate-csv",
          createFromCsv: "POST /api/v1/users/bulk/csv",
          createFromJson: "POST /api/v1/users/bulk/json",
        },
        stats: "GET /api/v1/users/stats/summary",
      },
      sessions: {
        create: "POST /api/v1/sessions",
        list: "GET /api/v1/sessions",
        get: "GET /api/v1/sessions/:id",
        getByCode: "GET /api/v1/sessions/code/:code",
        update: "PUT /api/v1/sessions/:id",
        delete: "DELETE /api/v1/sessions/:id",
        stats: "GET /api/v1/sessions/stats",
        participants: {
          create: "POST /api/v1/sessions/:sessionId/participants",
          bulk: "POST /api/v1/sessions/:sessionId/participants/bulk",
          list: "GET /api/v1/sessions/:sessionId/participants",
          update: "PUT /api/v1/sessions/:sessionId/participants/:participantId",
          delete:
            "DELETE /api/v1/sessions/:sessionId/participants/:participantId",
        },
      },
      tests: {
        create: "POST /api/v1/tests",
        list: "GET /api/v1/tests",
        get: "GET /api/v1/tests/:id",
        update: "PUT /api/v1/tests/:id",
        updateDisplayOrder: "PUT /api/v1/tests/:id/display-order",
        delete: "DELETE /api/v1/tests/:id",
        prerequisites: "GET /api/v1/tests/:id/prerequisites",
        schema: "GET /api/v1/tests/schema",
        analytics: "GET /api/v1/tests/:id/analytics",
        stats: "GET /api/v1/tests/stats/summary",
        categories: "GET /api/v1/tests/categories",
        moduleTypes: "GET /api/v1/tests/module-types",
        categoriesByType: "GET /api/v1/tests/categories/:moduleType",
        filterOptions: "GET /api/v1/tests/filters/options",
        questions: {
          create: "POST /api/v1/tests/:testId/questions",
          list: "GET /api/v1/tests/:testId/questions",
          get: "GET /api/v1/tests/:testId/questions/:questionId",
          update: "PUT /api/v1/tests/:testId/questions/:questionId",
          updateSequence:
            "PUT /api/v1/tests/:testId/questions/:questionId/sequence",
          delete: "DELETE /api/v1/tests/:testId/questions/:questionId",
          stats: "GET /api/v1/tests/:testId/questions/stats",
        },
      },
      attempts: {
        start: "POST /api/v1/attempts/start",
        get: "GET /api/v1/attempts/:attemptId",
        update: "PUT /api/v1/attempts/:attemptId",
        finish: "POST /api/v1/attempts/:attemptId/finish",
        progress: "GET /api/v1/attempts/:attemptId/progress",
        getUserAttempts: "GET /api/v1/attempts/user/:userId",
        getSessionAttempts: "GET /api/v1/attempts/session/:sessionId",
        statusOptions: "GET /api/v1/attempts/utils/status-options",
        stats: "GET /api/v1/attempts/stats/summary",
        answers: {
          submit: "POST /api/v1/attempts/:attemptId/answers",
          getAttemptAnswers: "GET /api/v1/attempts/:attemptId/answers",
          getSpecificAnswer:
            "GET /api/v1/attempts/:attemptId/answers/:questionId",
          autoSave: "POST /api/v1/attempts/:attemptId/answers/auto-save",
          stats: "GET /api/v1/attempts/:attemptId/answers/stats",
          answerTypes:
            "GET /api/v1/attempts/:attemptId/answers/utils/answer-types",
        },
      },
      results: {
        getByAttempt: "GET /api/v1/results/attempt/:attemptId",
        getUserResults: "GET /api/v1/results/user/:userId",
        getTestResults: "GET /api/v1/results/test/:testId",
        calculate: "POST /api/v1/results/calculate",
        generateReport: "GET /api/v1/results/:resultId/report",
        generateCertificate: "GET /api/v1/results/:resultId/certificate",
        filterOptions: "GET /api/v1/results/filters/options",
        stats: "GET /api/v1/results/stats/summary",
      },
      dashboard: {
        admin: "GET /api/v1/dashboard/admin",
        participant: "GET /api/v1/dashboard/participant",
        config: "GET /api/v1/dashboard/config",
        health: "GET /api/v1/dashboard/health",
        analytics: "GET /api/v1/dashboard/analytics/summary",
        export: "GET /api/v1/dashboard/export",
      },
      reports: {
        individual: "GET /api/v1/reports/individual/:userId",
        sessionSummary: "GET /api/v1/reports/session/:sessionId",
        comparative: "GET /api/v1/reports/comparative/:sessionId",
        batch: "GET /api/v1/reports/batch/:sessionId",
        config: "GET /api/v1/reports/config",
        stats: "GET /api/v1/reports/stats/summary",
        health: "GET /api/v1/reports/health",
      },
      analytics: {
        tests: "GET /api/v1/analytics/tests",
        sessions: "GET /api/v1/analytics/sessions",
        users: "GET /api/v1/analytics/users",
        performance: "GET /api/v1/analytics/performance",
        completionRates: "GET /api/v1/analytics/completion-rates",
        traits: "GET /api/v1/analytics/traits",
        config: "GET /api/v1/analytics/config",
        health: "GET /api/v1/analytics/health",
      },
    },
  });
});

// Cloudflare Cron Trigger handler for production
export default {
  fetch: app.fetch.bind(app),

  // Handle scheduled events (cron triggers)
  async scheduled(event: any, env: CloudflareBindings, ctx: any) {
    console.log("⏰ Cron trigger fired:", new Date().toISOString());

    // Import and run scheduled jobs
    const { runScheduledJobs } = await import("./lib/scheduler");

    // Use waitUntil to ensure the job completes before the worker terminates
    ctx.waitUntil(runScheduledJobs(env));
  },
};
