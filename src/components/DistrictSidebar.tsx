import { Home, School, Users, Database, BarChart3, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import logoMark from "@/assets/logo-mark.svg";
import logo from "@/assets/logo.svg";

const navigation = [
  { name: 'Dashboard', href: '/district-dash', icon: Home },
  { name: 'Schools', href: '/district-dash/schools', icon: School },
  { name: 'Users', href: '/district-dash/users', icon: Users },
  { name: 'Infinite Campus', href: '/district-dash/ic-integrations', icon: Database },
  { name: 'Reports', href: '/district-dash/reports', icon: BarChart3 },
  { name: 'Settings', href: '/district-dash/settings', icon: Settings },
];

export function DistrictSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <Sidebar 
      collapsible="icon"
      className="border-r border-border/40"
    >
      <SidebarContent>
        <SidebarGroup>
          <div className={`flex items-center py-3 mb-4 ${state === 'collapsed' && !isMobile ? 'justify-center px-1' : 'justify-between px-4'}`}>
            {state === 'collapsed' && !isMobile ? (
              <img 
                src={logoMark}
                alt="Dismissal Pro" 
                className="h-8 w-8"
              />
            ) : (
              <img 
                src={logo}
                alt="Dismissal Pro" 
                className="h-8"
              />
            )}
            
            {isMobile && (
              <button
                onClick={() => setOpenMobile(false)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild tooltip={item.name}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/district-dash'}
                      onClick={() => isMobile && setOpenMobile(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
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
