import { Home, Users, UserCog, Settings, Menu, Bus, Shield, Building2, BarChart3, CalendarDays, ClipboardList, HelpCircle, UserX, Plane, Calendar, RefreshCw, GitMerge } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.svg";
import logoMark from "@/assets/logo-mark.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const adminNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People", url: "/dashboard/people", icon: Users },
  { title: "Dismissals", url: "/dashboard/dismissals", icon: ClipboardList },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const teacherNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Coverage", url: "/dashboard/people/coverage", icon: CalendarDays },
  { title: "Absences", url: "/dashboard/people/absences", icon: UserX },
  { title: "People", url: "/dashboard/people/manage", icon: UserCog },
  { title: "Groups & Teams", url: "/dashboard/people/groups-teams", icon: Users },
  { title: "Special Runs", url: "/dashboard/dismissals/special-runs", icon: Calendar },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { userRole } = useAuth();
  const currentPath = location.pathname;

  let navItems = userRole === 'teacher' ? teacherNavItems : adminNavItems;
  if (userRole === 'system_admin') {
    navItems = [
      ...navItems,
      { title: "System Administration", url: "/admin", icon: Shield },
      { title: "Manage Schools", url: "/admin/schools", icon: Building2 },
      { title: "Manage Users", url: "/admin/users", icon: Users },
    ];
  }
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <div className={`flex items-center py-3 ${state === 'collapsed' ? 'justify-center px-1' : 'px-4'}`}>
            {state === 'collapsed' ? (
              <img 
                src={logoMark}
                alt="Dismissal Pro" 
                className="w-9 h-auto"
                title="Dismissal Pro"
              />
            ) : (
              <img 
                src={logo}
                alt="Dismissal Pro" 
                className="h-8"
              />
            )}
          </div>

          <SidebarGroupContent>
            <SidebarMenu className="pt-4">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="ml-3">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrations Section - Only for school admins */}
        {userRole === 'school_admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Integrations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/dashboard/integrations/infinite-campus" 
                      className={getNavCls}
                    >
                      <RefreshCw className="h-5 w-5" />
                      <span className="ml-3">Infinite Campus</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/dashboard/help" className={getNavCls}>
                <HelpCircle className="h-5 w-5" />
                <span className="ml-3">Help & Support</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}