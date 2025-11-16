import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function AdminLayout() {
  const [defaultOpen, setDefaultOpen] = useState<boolean>(true);

  useEffect(() => {
    const width = window.innerWidth;
    
    if (width >= 768 && width < 1024) {
      setDefaultOpen(false);
    } else if (width >= 1024) {
      setDefaultOpen(true);
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
