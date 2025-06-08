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

  // Admin routes (protected - admin only)
  layout("routes/_admin.tsx", [
    route("/admin/dashboard", "routes/admin.dashboard.tsx"),
    //   route("/admin/participants", "routes/admin.participants.tsx"),
    //   route("/admin/participants/new", "routes/admin.participants.new.tsx"),
    //   route("/admin/participants/:id", "routes/admin.participants.$id.tsx"),
    //   route("/admin/tests", "routes/admin.tests.tsx"),
    //   route("/admin/tests/new", "routes/admin.tests.new.tsx"),
    //   route("/admin/tests/edit", "routes/admin.tests.edit.tsx"),
    //   route("/admin/tests/:testId", "routes/admin.tests.$testId.tsx"),
    //   route("/admin/sessions", "routes/admin.sessions.tsx"),
    //   route("/admin/reports", "routes/admin.reports.tsx"),
  ]),

  // Participant routes (protected - participant only)
  layout("routes/_participant.tsx", [
    route("/participant/dashboard", "routes/participant.dashboard.tsx"),
    //   route("/participant/test", "routes/participant.test.tsx"),
  ]),
] satisfies RouteConfig;
