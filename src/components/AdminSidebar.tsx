import { Home, Users, UserCog, Settings, Menu, Bus, Shield, Building2, BarChart3, CalendarDays, ClipboardList, HelpCircle, UserX } from "lucide-react";
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
  { title: "Dismissal Plans", url: "/dashboard/dismissal-plans", icon: ClipboardList },
  { title: "Classes", url: "/dashboard/classes", icon: Users },
  { title: "Coverage", url: "/dashboard/coverage", icon: CalendarDays },
  { title: "Absences", url: "/dashboard/absences", icon: UserX },
  { title: "People", url: "/dashboard/people", icon: UserCog },
  { title: "Transportation", url: "/dashboard/transportation", icon: Bus },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const teacherNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Coverage", url: "/dashboard/coverage", icon: CalendarDays },
  { title: "Absences", url: "/dashboard/absences", icon: UserX },
  { title: "People", url: "/dashboard/people", icon: UserCog },
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
          <div className={`flex items-center py-3 ${state === 'collapsed' ? 'justify-center px-2' : 'px-4'}`}>
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