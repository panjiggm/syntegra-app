import { AppSidebarAdmin } from "~/components/layout/app-sidebar-admin";
import { AdminRoute } from "~/components/auth/route-guards";
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
import type { Route } from "./+types/_admin";

// Mapping untuk breadcrumb
const breadcrumbMap: Record<string, { title: string; href?: string }> = {
  "/admin/dashboard": { title: "Dashboard" },
  "/admin/participants": { title: "Manajemen Peserta" },
  "/admin/reports": { title: "Laporan & Hasil" },
  "/admin/tests": { title: "Modul Psikotes" },
  "/admin/sessions": { title: "Jadwal & Sesi" },
  "/admin/settings": { title: "Pengaturan Sistem" },
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Panel - Syntegra Psikotes" },
    { name: "description", content: "Panel administrasi Syntegra Psikotes" },
  ];
}

export default function AdminLayout() {
  const location = useLocation();

  // Handle dynamic routes
  const getBreadcrumb = () => {
    if (
      location.pathname.startsWith("/admin/participants/") &&
      location.pathname !== "/admin/participants"
    ) {
      // This is a user detail page
      return {
        parent: { title: "Manajemen Peserta", href: "/admin/participants" },
        current: { title: "Detail Peserta" },
      };
    }

    if (
      location.pathname.startsWith("/admin/tests/") &&
      location.pathname !== "/admin/tests"
    ) {
      return {
        parent: { title: "Modul Psikotes", href: "/admin/tests" },
        current: { title: "Detail Tes" },
      };
    }

    if (
      location.pathname.startsWith("/admin/sessions/") &&
      location.pathname !== "/admin/sessions"
    ) {
      return {
        parent: { title: "Jadwal & Sesi", href: "/admin/sessions" },
        current: { title: "Detail Sesi" },
      };
    }

    return {
      current: breadcrumbMap[location.pathname],
    };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <AdminRoute>
      <SidebarProvider>
        <AppSidebarAdmin />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/admin/dashboard">
                      Sistem Psikotes
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
    </AdminRoute>
  );
}
