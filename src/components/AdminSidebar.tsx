import { Home, Users, GraduationCap, UserCog, Settings, Menu, Bus } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
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
  { title: "Dismissal Plans", url: "/dashboard/dismissal-plans", icon: GraduationCap },
  { title: "Classes", url: "/dashboard/classes", icon: Users },
  { title: "People", url: "/dashboard/people", icon: UserCog },
  { title: "Transportation", url: "/dashboard/transportation", icon: Bus },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const teacherNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People", url: "/dashboard/people", icon: UserCog },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { userRole } = useAuth();
  const currentPath = location.pathname;

  const navItems = userRole === 'teacher' ? teacherNavItems : adminNavItems;
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <div className={`flex items-center gap-2 font-bold text-lg px-4 py-3 ${state === 'collapsed' ? 'justify-center' : ''}`}>
            <GraduationCap className="h-6 w-6 text-primary" />
            {state !== 'collapsed' && (
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Dismissal Pro
              </span>
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
    </Sidebar>
  );
}