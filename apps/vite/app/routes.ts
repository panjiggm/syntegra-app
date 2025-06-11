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

  // Psikotes routes (public - participant)
  route("/psikotes/:sessionCode", "routes/psikotes.$sessionCode.tsx"),

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
    route("/admin/sessions/:sessionId", "routes/admin.sessions.$sessionId.tsx"),

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
    route(
      "/psikotes/:sessionCode/tests",
      "routes/psikotes.$sessionCode.tests.tsx"
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
      "/psikotes/:sessionCode/test/:testId/complete",
      "routes/psikotes.$sessionCode.test.$testId.complete.tsx"
    ),
    route(
      "/psikotes/:sessionCode/test/complete",
      "routes/psikotes.$sessionCode.test.complete.tsx"
    ),
  ]),
] satisfies RouteConfig;
