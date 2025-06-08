import { Navigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { LoginFormParticipant } from "~/components/form/login-form-participant";

export function meta() {
  return [
    { title: "Login Peserta - Syntegra" },
    {
      name: "description",
      content: "Masuk sebagai peserta untuk mengakses tes psikologi",
    },
  ];
}

export default function ParticipantLoginPage() {
  const { isAuthenticated, hasRole } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated && hasRole("participant")) {
    return <Navigate to="/participant/dashboard" replace />;
  }

  const handleSuccess = () => {
    console.log("Participant login successful");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <LoginFormParticipant onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
