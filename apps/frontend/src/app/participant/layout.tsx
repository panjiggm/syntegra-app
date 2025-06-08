import { AppSidebar } from "@/components/app-sidebar";
import { ParticipantRoute } from "@/components/auth/ParticipantRoute";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React, { ReactNode } from "react";

const LayoutParticipant = ({ children }: { children: ReactNode }) => {
  return (
    <ParticipantRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="container mx-auto max-w-7xl px-4 py-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ParticipantRoute>
  );
};

export default LayoutParticipant;
