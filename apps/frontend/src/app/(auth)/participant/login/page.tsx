import { LoginFormParticipant } from "@/components/form/login-form-participant";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ParticipantLoginPage() {
  const session = await auth();
  if (session?.user?.role === "participant") {
    redirect("/participant/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginFormParticipant />
      </div>
    </div>
  );
}
