import { AppSidebar } from "~/components/layout/app-sidebar";
import { ParticipantRoute } from "~/components/auth/route-guards";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useLocation } from "react-router";
import { Outlet } from "react-router";
import type { Route } from "./+types/_participant";

// Mapping untuk breadcrumb participant
const breadcrumbMap: Record<string, { title: string; href?: string }> = {
  "/participant/dashboard": { title: "Dashboard" },
  "/participant/tests": { title: "Psikotes" },
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Participant Panel - Syntegra Psikotes" },
    { name: "description", content: "Panel peserta Syntegra Psikotes" },
  ];
}

export default function ParticipantLayout() {
  const location = useLocation();

  // Handle dynamic routes untuk participant
  const getBreadcrumb = () => {
    if (
      location.pathname.startsWith("/participant/tests/") &&
      location.pathname !== "/participant/tests"
    ) {
      // This is a test detail page or session
      if (location.pathname.includes("/session/")) {
        return {
          parent: { title: "Psikotes", href: "/participant/tests" },
          current: { title: "Sesi Tes" },
        };
      }
      return {
        parent: { title: "Psikotes", href: "/participant/tests" },
        current: { title: "Detail Tes" },
      };
    }

    if (
      location.pathname.startsWith("/participant/dashboard/") &&
      location.pathname !== "/participant/dashboard"
    ) {
      // This is a dashboard sub-page
      return {
        parent: { title: "Dashboard", href: "/participant/dashboard" },
        current: { title: "Detail" },
      };
    }

    return {
      current: breadcrumbMap[location.pathname],
    };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <ParticipantRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/participant/dashboard">
                      Psikotes
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumb.parent && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href={breadcrumb.parent.href}>
                          {breadcrumb.parent.title}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  )}
                  {breadcrumb.current && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          {breadcrumb.current.title}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="container mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ParticipantRoute>
  );
}
