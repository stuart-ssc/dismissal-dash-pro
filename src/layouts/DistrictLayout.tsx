import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DistrictSidebar } from "@/components/DistrictSidebar";
import { DistrictHeader } from "@/components/DistrictHeader";
import { DistrictAuthProvider } from "@/hooks/useDistrictAuth";

export default function DistrictLayout() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

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
    <DistrictAuthProvider>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={{
          "--sidebar-width": "14rem",
        } as React.CSSProperties}
      >
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <DistrictSidebar />
          
          <div className="flex flex-col flex-1 min-w-0">
            <DistrictHeader />
            
            <main className="flex-1 overflow-x-hidden">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </DistrictAuthProvider>
  );
}
