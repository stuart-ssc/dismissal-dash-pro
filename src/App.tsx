import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Transportation from "./pages/Transportation";
import Classes from "./pages/Classes";
import Dismissals from "./pages/Dismissals";
import DismissalPlans from "./pages/DismissalPlans";
import Import from "./pages/Import";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import DismissalGroups from "./pages/admin/DismissalGroups";
import AdminClasses from "./pages/admin/Classes";
import People from "./pages/admin/People";
import PeopleManagement from "./pages/People";
import AdminSettings from "./pages/admin/Settings";
import Settings from "./pages/Settings";
import CarLines from "./pages/CarLines";
import WalkerLocations from "./pages/WalkerLocations";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="people" element={<PeopleManagement />} />
              <Route path="classes" element={<Classes />} />
              <Route path="transportation" element={<Transportation />} />
              <Route path="dismissals" element={<Dismissals />} />
              <Route path="dismissal-plans" element={<DismissalPlans />} />
              <Route path="dismissal-plans/:planId/groups" element={<DismissalGroups />} />
              <Route path="settings" element={<Settings />} />
              <Route path="car-lines" element={<CarLines />} />
              <Route path="walker-locations" element={<WalkerLocations />} />
              <Route path="import" element={<Import />} />
            </Route>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/dismissal-groups" element={<DismissalGroups />} />
            <Route path="/admin/classes" element={<AdminClasses />} />
            <Route path="/admin/users" element={<People />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
