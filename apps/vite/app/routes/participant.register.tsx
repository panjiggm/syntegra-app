import { Navigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { RegisterFormParticipant } from "~/components/form/register-form-participant";

export function meta() {
  return [
    { title: "Daftar Peserta - Syntegra" },
    {
      name: "description",
      content: "Daftar sebagai peserta untuk mengikuti tes psikologi",
    },
  ];
}

export default function ParticipantRegisterPage() {
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSuccess = () => {
    console.log("Participant registration successful");
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterFormParticipant onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
