import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
