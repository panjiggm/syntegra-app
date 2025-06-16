import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { usePsikotesContext } from "./_psikotes";
import { useAuth } from "~/contexts/auth-context";

export default function PsikotesSessionPage() {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { sessionData, participantStatus } = usePsikotesContext();

  // Auto redirect authenticated users to tests page
  useEffect(() => {
    if (isAuthenticated && participantStatus && sessionData) {
      navigate(`/psikotes/${sessionCode}/tests`, { replace: true });
    }
  }, [isAuthenticated, participantStatus, sessionData, sessionCode, navigate]);

  // The login form and session validation is handled by the layout (_psikotes.tsx)
  // This route exists to handle the /psikotes/{sessionCode} URL structure
  // When user is not authenticated, the layout will show the login form
  // When authenticated, we redirect to tests page above

  return null; // Layout handles all the UI
}
