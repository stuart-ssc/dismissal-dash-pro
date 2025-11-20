import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useImpersonationStatus } from "@/hooks/useImpersonationStatus";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const { isImpersonating, schoolName, adminType, endImpersonation } = useImpersonationStatus();

  useEffect(() => {
    const tabletMql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    const desktopMql = window.matchMedia("(min-width: 1025px)");

    const updateSidebarState = () => {
      if (desktopMql.matches) {
        setSidebarOpen(true);
      } else if (tabletMql.matches) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(false);
      }
    };

    updateSidebarState();
    
    tabletMql.addEventListener("change", updateSidebarState);
    desktopMql.addEventListener("change", updateSidebarState);

    return () => {
      tabletMql.removeEventListener("change", updateSidebarState);
      desktopMql.removeEventListener("change", updateSidebarState);
    };
  }, []);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          {isImpersonating && schoolName && adminType && (
            <ImpersonationBanner
              schoolName={schoolName}
              adminType={adminType}
              onEndImpersonation={endImpersonation}
            />
          )}
          <DashboardHeader />
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
