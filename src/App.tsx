import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transportation from "./pages/Transportation";
import Classes from "./pages/Classes";
import Dismissals from "./pages/Dismissals";
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/people" element={<PeopleManagement />} />
            <Route path="/dashboard/classes" element={<Classes />} />
            <Route path="/dashboard/transportation" element={<Transportation />} />
            <Route path="/dashboard/dismissals" element={<Dismissals />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/car-lines" element={<CarLines />} />
            <Route path="/dashboard/import" element={<Import />} />
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
