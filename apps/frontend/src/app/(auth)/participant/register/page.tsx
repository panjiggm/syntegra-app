import { RegisterFormParticipant } from "@/components/form/register-form-participant";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ParticipantRegisterPage() {
  const session = await auth();
  if (session?.user?.role === "participant") {
    redirect("/participant/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterFormParticipant />
      </div>
    </div>
  );
}
