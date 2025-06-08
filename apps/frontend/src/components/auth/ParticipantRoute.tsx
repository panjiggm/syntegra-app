"use client";

import { ProtectedRoute } from "./ProtectedRoute";

interface ParticipantRouteProps {
  children: React.ReactNode;
}

export function ParticipantRoute({ children }: ParticipantRouteProps) {
  return (
    <ProtectedRoute
      allowedRoles={["participant"]}
      redirectTo="/participant/login"
    >
      {children}
    </ProtectedRoute>
  );
}
