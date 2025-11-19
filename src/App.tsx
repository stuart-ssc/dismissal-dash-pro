import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import SpecialTrips from "./pages/SpecialTrips";
import Contact from "./pages/Contact";
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
import AdminSchools from "./pages/admin/Schools";
import YearEndRollover from "./pages/admin/YearEndRollover";
import RolloverHistory from "./pages/admin/RolloverHistory";
import GroupsTeams from "./pages/GroupsTeams";
import SpecialUseRuns from "./pages/SpecialUseRuns";
import PeopleHub from "./pages/PeopleHub";
import DismissalsHub from "./pages/DismissalsHub";
import SpecialUseRunDetail from "./pages/SpecialUseRunDetail";
import SpecialUseRunMode from "./pages/modes/SpecialUseRunMode";
import Settings from "./pages/Settings";
import CarLines from "./pages/CarLines";
import WalkerLocations from "./pages/WalkerLocations";
import Reports from "./pages/Reports";
import ModeUsageReports from "./pages/ModeUsageReports";
import DismissalDetailReport from "./pages/DismissalDetailReport";
import VerifyEmailChange from "./pages/VerifyEmailChange";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { MultiSchoolProvider } from "./hooks/useMultiSchool";
import InfiniteCampus from "./pages/admin/InfiniteCampus";
import ArchivedUsers from "./pages/admin/ArchivedUsers";
import DismissalLauncher from "./pages/DismissalLauncher";
import AdminLayout from "./layouts/AdminLayout";
import ClassroomMode from "./pages/modes/ClassroomMode";
import BusMode from "./pages/modes/BusMode";
import CarLineMode from "./pages/modes/CarLineMode";
import WalkerMode from "./pages/modes/WalkerMode";
import { RouteGuard, DistrictRouteGuard } from "./components/RouteGuard";
import TeacherCoverage from "./pages/TeacherCoverage";
import Help from "./pages/Help";
import Absences from "./pages/Absences";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import DistrictLayout from "./layouts/DistrictLayout";
import DistrictDashboard from "./pages/district/Dashboard";


const queryClient = new QueryClient();

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

const AppContent = () => {
  useSessionTimeout();
  
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/special-trips" element={<SpecialTrips />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email-change" element={<VerifyEmailChange />} />

          {/* Admin layout for dashboard routes */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/dismissal" element={<DismissalLauncher />} />
            
            {/* People Hub Routes */}
            <Route path="/dashboard/people" element={<PeopleHub />} />
            <Route path="/dashboard/people/manage" element={<PeopleManagement />} />
            <Route path="/dashboard/people/classes" element={<Classes />} />
            <Route path="/dashboard/people/coverage" element={<TeacherCoverage />} />
            <Route path="/dashboard/people/absences" element={<Absences />} />
            <Route path="/dashboard/people/groups-teams" element={<GroupsTeams />} />
            <Route path="/dashboard/people/archived" element={<ArchivedUsers />} />
            
            {/* Dismissals Hub Routes */}
            <Route path="/dashboard/dismissals" element={<DismissalsHub />} />
            <Route path="/dashboard/dismissals/plans" element={<DismissalPlans />} />
            <Route path="/dashboard/dismissals/plans/:planId/groups" element={<DismissalGroups />} />
            <Route path="/dashboard/dismissals/transportation" element={<Transportation />} />
            <Route path="/dashboard/dismissals/special-runs" element={<SpecialUseRuns />} />
            <Route path="/dashboard/dismissals/special-runs/:runId" element={<SpecialUseRunDetail />} />
            
            {/* Other Routes */}
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="/dashboard/reports/detail" element={<DismissalDetailReport />} />
            <Route path="/dashboard/reports/mode-usage" element={<ModeUsageReports />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/help" element={<Help />} />
            <Route path="/dashboard/year-end-rollover" element={<YearEndRollover />} />
            <Route path="/dashboard/import" element={<Import />} />
            
            {/* Backward Compatibility Redirects */}
            <Route path="/dashboard/coverage" element={<Navigate to="/dashboard/people/coverage" replace />} />
            <Route path="/dashboard/absences" element={<Navigate to="/dashboard/people/absences" replace />} />
            <Route path="/dashboard/classes" element={<Navigate to="/dashboard/people/classes" replace />} />
            <Route path="/dashboard/transportation" element={<Navigate to="/dashboard/dismissals/transportation" replace />} />
            <Route path="/dashboard/dismissal-plans" element={<Navigate to="/dashboard/dismissals/plans" replace />} />
            <Route path="/dashboard/special-use-groups" element={<Navigate to="/dashboard/people/groups-teams" replace />} />
            <Route path="/dashboard/special-use-runs" element={<Navigate to="/dashboard/dismissals/special-runs" replace />} />
            <Route path="/dashboard/car-lines" element={<Navigate to="/dashboard/dismissals/transportation" replace />} />
            <Route path="/dashboard/walker-locations" element={<Navigate to="/dashboard/dismissals/transportation" replace />} />
              {/* New unified IC hub */}
              <Route path="/dashboard/integrations/infinite-campus" element={<InfiniteCampus />} />
              
              {/* Redirects for backward compatibility */}
              <Route path="/dashboard/integrations/ic-sync" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=overview" replace />} />
              <Route path="/dashboard/integrations/ic-sync-history" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=sync" replace />} />
              <Route path="/dashboard/integrations/ic-pending-merges" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=merges" replace />} />
              <Route path="/dashboard/integrations/ic-data-quality" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=quality" replace />} />
              <Route path="/dashboard/integrations/ic-auto-merge-rules" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=rules" replace />} />
              <Route path="/dashboard/integrations/ic-merge-audit" element={<Navigate to="/dashboard/integrations/infinite-campus?tab=audit" replace />} />
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
          <Route path="/admin/schools" element={<AdminSchools />} />
          
          <Route path="/admin/rollover-history" element={<RolloverHistory />} />
          
          {/* Special Use Run Mode (fullscreen) */}
          <Route path="/modes/special-use-run/:runId" element={<SpecialUseRunMode />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MultiSchoolProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </MultiSchoolProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
