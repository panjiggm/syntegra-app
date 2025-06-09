import { AppSidebar } from "~/components/layout/app-sidebar";
import { ParticipantRoute } from "~/components/auth/route-guards";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Outlet } from "react-router";
import type { Route } from "./+types/_participant";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Participant Panel - Syntegra Psikotes" },
    { name: "description", content: "Panel peserta Syntegra Psikotes" },
  ];
}

export default function ParticipantLayout() {
  return (
    <ParticipantRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="container mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ParticipantRoute>
  );
}
