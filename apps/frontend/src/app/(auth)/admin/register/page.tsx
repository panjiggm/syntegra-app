import { RegisterFormAdmin } from "@/components/form/register-form-admin";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminRegisterPage() {
  const session = await auth();
  if (session?.user?.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <RegisterFormAdmin />
      </div>
    </div>
  );
}
