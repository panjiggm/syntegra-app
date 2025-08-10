import * as React from "react";
import { BarChart3, Brain, BookCheck } from "lucide-react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";

// Data untuk sistem psikotes participant
const data = {
  company: {
    name: "Syntegra Services",
    subTitle: "Sistem Psikotes Digital",
    logo: "/images/syntegra-clear-logo.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/participant/dashboard",
      icon: BarChart3,
    },
    {
      title: "Psikotes",
      url: "/participant/tests",
      icon: Brain,
    },
    {
      title: "Administration",
      url: "/participant/administration",
      icon: BookCheck,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher company={data.company} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
