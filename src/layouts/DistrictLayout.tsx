import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DistrictSidebar } from "@/components/DistrictSidebar";
import { DistrictHeader } from "@/components/DistrictHeader";
import { DistrictAuthProvider } from "@/hooks/useDistrictAuth";

export default function DistrictLayout() {
  return (
    <DistrictAuthProvider>
      <SidebarProvider
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
