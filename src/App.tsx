
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transportation from "./pages/Transportation";
import Classes from "./pages/Classes";
import Dismissals from "./pages/Dismissals";
import DismissalPlans from "./pages/DismissalPlans";
import Import from "./pages/Import";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import DismissalGroups from "./pages/admin/DismissalGroups";
import AdminClasses from "./pages/admin/Classes";
import AdminUsers from "./pages/admin/Users";
import EmailManagement from "./pages/admin/EmailManagement";
import PeopleManagement from "./pages/People";
import AdminSettings from "./pages/admin/Settings";
import AdminSchools from "./pages/admin/Schools";
import Settings from "./pages/Settings";
import CarLines from "./pages/CarLines";
import WalkerLocations from "./pages/WalkerLocations";
import Reports from "./pages/Reports";
import ModeUsageReports from "./pages/ModeUsageReports";
import { AuthProvider } from "./hooks/useAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import DismissalLauncher from "./pages/DismissalLauncher";
import AdminLayout from "./layouts/AdminLayout";
import ClassroomMode from "./pages/modes/ClassroomMode";
import BusMode from "./pages/modes/BusMode";
import CarLineMode from "./pages/modes/CarLineMode";
import WalkerMode from "./pages/modes/WalkerMode";
import { RouteGuard } from "./components/RouteGuard";


const queryClient = new QueryClient();

const AppContent = () => {
  // Enable session timeout for enhanced security
  useSessionTimeout();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />

        {/* Admin layout for dashboard routes */}
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/people" element={<PeopleManagement />} />
          <Route path="/dashboard/classes" element={<Classes />} />
          <Route path="/dashboard/transportation" element={<Transportation />} />
          <Route path="/dashboard/dismissals" element={<Dismissals />} />
          <Route path="/dashboard/dismissal" element={<DismissalLauncher />} />
          <Route path="/dashboard/dismissal-plans" element={<DismissalPlans />} />
          <Route path="/dashboard/dismissal-plans/:planId/groups" element={<DismissalGroups />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/car-lines" element={<CarLines />} />
          <Route path="/dashboard/walker-locations" element={<WalkerLocations />} />
          <Route path="/dashboard/reports" element={<Reports />} />
          <Route path="/dashboard/reports/mode-usage" element={<ModeUsageReports />} />
          <Route path="/dashboard/import" element={<Import />} />
        </Route>

        {/* Fullscreen dismissal modes (no left navigation) */}
        <Route path="/dashboard/dismissal/classroom" element={<ClassroomMode />} />
        <Route path="/dashboard/dismissal/bus" element={
          <RouteGuard mode="bus">
            <BusMode />
          </RouteGuard>
        } />
        <Route path="/dashboard/dismissal/car-line" element={<CarLineMode />} />
        <Route path="/dashboard/dismissal/walker" element={<WalkerMode />} />

        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/dismissal-groups" element={<DismissalGroups />} />
        <Route path="/admin/classes" element={<AdminClasses />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/email-management" element={<EmailManagement />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/schools" element={<AdminSchools />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
