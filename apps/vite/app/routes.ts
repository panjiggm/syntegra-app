import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/home.tsx"),

  // Auth routes (public only - redirect if authenticated)
  route("/admin/login", "routes/admin.login.tsx"),
  route("/admin/register", "routes/admin.register.tsx"),
  route("/participant/login", "routes/participant.login.tsx"),
  route("/participant/register", "routes/participant.register.tsx"),

  // Pubic Registration
  route("/registration", "routes/registration.tsx"),

  // Admin routes (protected - admin only)
  layout("routes/_admin.tsx", [
    // dashboard
    route("/admin/dashboard", "routes/admin.dashboard.tsx"),

    // users
    route("/admin/users", "routes/admin.users.tsx"),
    route("/admin/users/new", "routes/admin.users.new.tsx"),
    route("/admin/users/:userId", "routes/admin.users.$userId.tsx"),
    route("/admin/users/:userId/edit", "routes/admin.users.$userId.edit.tsx"),

    // tests
    route("/admin/tests", "routes/admin.tests.tsx"),
    route("/admin/tests/new", "routes/admin.tests.new.tsx"),
    route("/admin/tests/:testId", "routes/admin.tests.$testId.tsx"),
    route("/admin/tests/:testId/edit", "routes/admin.tests.$testId.edit.tsx"),

    // sessions
    route("/admin/sessions", "routes/admin.sessions.tsx"),
    route("/admin/sessions/new", "routes/admin.sessions.new.tsx"),
    route("/admin/sessions/:sessionId", "routes/admin.sessions.$sessionId.tsx"),
    route(
      "/admin/sessions/:sessionId/edit",
      "routes/admin.sessions.$sessionId.edit.tsx"
    ),

    // Live Test Monitoring
    route("/admin/live-test", "routes/admin.live-test.tsx"),

    // reports
    route("/admin/reports", "routes/admin.reports.tsx"),
  ]),

  // Participant routes (protected - participant only)
  layout("routes/_participant.tsx", [
    route("/participant/dashboard", "routes/participant.dashboard.tsx"),
    route("/participant/tests", "routes/participant.tests.tsx"),
  ]),

  // Psikotes routes (protected - participant only)
  layout("routes/_psikotes.tsx", [
    route("/psikotes/:sessionCode", "routes/psikotes.$sessionCode.tsx"),
    route(
      "/psikotes/:sessionCode/:sessionId",
      "routes/psikotes.$sessionCode.$sessionId.tsx"
    ),
    route(
      "/psikotes/:sessionCode/test/:testId",
      "routes/psikotes.$sessionCode.test.$testId.tsx"
    ),
    route(
      "/psikotes/:sessionCode/test/:testId/question/:questionId",
      "routes/psikotes.$sessionCode.test.$testId.question.$questionId.tsx"
    ),
    route(
      "/psikotes/:sessionCode/:sessionId/complete",
      "routes/psikotes.$sessionCode.$sessionId.complete.tsx"
    ),
  ]),
] satisfies RouteConfig;
