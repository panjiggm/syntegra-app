import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { useSessions } from "~/hooks/use-sessions";

export default function PsikotesSessionPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { useGetPublicSessionByCode } = useSessions();

  // Get session data to obtain sessionId
  const {
    data: sessionData,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useGetPublicSessionByCode(sessionCode || "");

  // Auto redirect authenticated users to session by ID page
  useEffect(() => {
    if (isAuthenticated && sessionData && sessionData.id) {
      // Redirect to new route using sessionId from response
      navigate(`/psikotes/${sessionCode}/${sessionData.id}`, { replace: true });
    }
  }, [isAuthenticated, sessionData, sessionCode, navigate]);

  // Show loading while getting session data
  if (isLoadingSession) {
    return null; // Layout will show loading state
  }

  // Show error if session not found
  if (sessionError || !sessionData) {
    return null; // Layout will handle error state
  }

  // The login form and session validation is handled by the layout (_psikotes.tsx)
  // This route exists to handle the /psikotes/{sessionCode} URL structure
  // When user is not authenticated, the layout will show the login form
  // When authenticated, we get sessionId from getBySessionCode and redirect to sessionId route

  return null; // Layout handles all the UI
}
