import * as React from "react";
import {
  BarChart3,
  Users,
  Brain,
  FileText,
  Clock,
  Monitor,
  Target,
  FolderOpen,
  Activity,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import { NavUserAdmin } from "./nav-user-admin";

// Data untuk sistem psikotes
const data = {
  company: {
    name: "Syntegra Services",
    subTitle: "Sistem Psikotes Digital",
    logo: "/images/syntegra-clear-logo.png",
  },
  navHome: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: BarChart3,
      isActive: true,
    },
  ],
  navMain: [
    {
      title: "Manajemen Peserta",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Modul Psikotes",
      url: "/admin/tests",
      icon: Brain,
    },
    {
      title: "Jadwal & Sesi",
      url: "/admin/sessions",
      icon: Clock,
    },
    // {
    //   title: "Live Test Monitor",
    //   url: "/admin/live-test",
    //   icon: Monitor,
    // },
    {
      title: "Laporan & Hasil",
      url: "/admin/reports",
      icon: FileText,
    },
  ],
  navAdministration: [
    {
      title: "Dokumen Peserta",
      url: "/admin/participant-documents",
      icon: FolderOpen,
    },
  ],
  navPhysicsTest: [
    {
      title: "Tes Fisik",
      url: "/admin/physical-tests",
      icon: Activity,
    },
  ],
};

export function AppSidebarAdmin({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher company={data.company} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navHome} label="Beranda" />
        <NavMain items={data.navMain} label="Psikotes" />
        <NavMain items={data.navAdministration} label="Administrasi (Next)" />
        <NavMain items={data.navPhysicsTest} label="Tes Fisik (Next)" />
      </SidebarContent>
      <SidebarFooter>
        <NavUserAdmin />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
