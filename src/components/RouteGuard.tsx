import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  mode: "bus" | "car-line" | "walker" | "classroom";
}

export function RouteGuard({ children, mode }: RouteGuardProps) {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locationCheck, setLocationCheck] = useState<{ completed: boolean; loading: boolean }>({
    completed: false,
    loading: true
  });

  useEffect(() => {
    const checkLocationAccess = async () => {
      if (isLoading || !run || !schoolId) return;

      setLocationCheck({ completed: false, loading: true });

      try {
        // For classroom mode, check if auto-timeout should trigger BEFORE checking completion
        if (mode === "classroom" && run.status !== "completed" && run.plan_id) {
          // Fetch dismissal groups to check the last group's release time
          const { data: groups } = await supabase
            .from("dismissal_groups")
            .select("release_offset_minutes")
            .eq("dismissal_plan_id", run.plan_id)
            .order("release_offset_minutes", { ascending: true });

          if (groups && groups.length > 0) {
            const { data: plan } = await supabase
              .from("dismissal_plans")
              .select("dismissal_time")
              .eq("id", run.plan_id)
              .single();

            if (plan?.dismissal_time) {
              const lastGroup = groups[groups.length - 1];
              const [hours, minutes] = plan.dismissal_time.split(':').map(Number);
              const baseDismissalTime = new Date(run.date);
              baseDismissalTime.setHours(hours, minutes, 0, 0);
              
              const lastGroupReleaseTime = new Date(
                baseDismissalTime.getTime() + (lastGroup.release_offset_minutes * 60000)
              );
              const now = new Date();
              const timeSinceLastGroup = now.getTime() - lastGroupReleaseTime.getTime();

              // If 60 minutes have passed, auto-complete the run
              if (timeSinceLastGroup > 60 * 60000) {
                await supabase
                  .from("dismissal_runs")
                  .update({
                    status: "completed",
                    ended_at: now.toISOString(),
                    completion_method: "auto_timeout"
                  })
                  .eq("id", run.id)
                  .neq("status", "completed");
                
                // Block access after auto-completing
                toast({
                  title: "Access Denied",
                  description: "Today's dismissal has been automatically completed (60 minutes elapsed).",
                  variant: "destructive",
                });
                navigate("/dashboard/dismissal", { replace: true });
                return;
              }
            }
          }
        }

        // For mode-level completion (bus and classroom), use existing logic
        if (mode === "bus" && run.bus_completed) {
          toast({
            title: "Access Denied",
            description: "Bus dismissal has already been completed for today.",
            variant: "destructive",
          });
          navigate("/dashboard/dismissal", { replace: true });
          return;
        }

        if (mode === "classroom" && run.status === "completed") {
          toast({
            title: "Access Denied", 
            description: "Today's dismissal has already been completed.",
            variant: "destructive",
          });
          navigate("/dashboard/dismissal", { replace: true });
          return;
        }

        // For location-based modes (walker and car-line), check if user has access to any uncompleted locations
        if (mode === "walker") {
          // Get all walker locations for this school
          const { data: locations } = await supabase
            .from("walker_locations")
            .select("id")
            .eq("school_id", schoolId);

          if (!locations || locations.length === 0) {
            setLocationCheck({ completed: true, loading: false });
            toast({
              title: "No Locations",
              description: "No walker locations found for this school.",
              variant: "destructive",
            });
            navigate("/dashboard/dismissal", { replace: true });
            return;
          }

          // Check which locations are completed
          const { data: completedLocations } = await supabase
            .from("walker_location_completions")
            .select("walker_location_id")
            .eq("dismissal_run_id", run.id);

          const completedLocationIds = new Set(completedLocations?.map(c => c.walker_location_id) || []);
          const availableLocations = locations.filter(loc => !completedLocationIds.has(loc.id));

          if (availableLocations.length === 0) {
            setLocationCheck({ completed: true, loading: false });
            toast({
              title: "Access Denied",
              description: "All walker locations have been completed for today.",
              variant: "destructive",
            });
            navigate("/dashboard/dismissal", { replace: true });
            return;
          }
        }

        if (mode === "car-line") {
          // Get all car lines for this school
          const { data: carLines } = await supabase
            .from("car_lines")
            .select("id")
            .eq("school_id", schoolId);

          if (!carLines || carLines.length === 0) {
            setLocationCheck({ completed: true, loading: false });
            toast({
              title: "No Locations",
              description: "No car lines found for this school.",
              variant: "destructive",
            });
            navigate("/dashboard/dismissal", { replace: true });
            return;
          }

          // Check which car lines are completed
          const { data: completedLines } = await supabase
            .from("car_line_completions")
            .select("car_line_id")
            .eq("dismissal_run_id", run.id);

          const completedLineIds = new Set(completedLines?.map(c => c.car_line_id) || []);
          const availableLines = carLines.filter(line => !completedLineIds.has(line.id));

          if (availableLines.length === 0) {
            setLocationCheck({ completed: true, loading: false });
            toast({
              title: "Access Denied",
              description: "All car lines have been completed for today.",
              variant: "destructive",
            });
            navigate("/dashboard/dismissal", { replace: true });
            return;
          }
        }

        setLocationCheck({ completed: false, loading: false });
      } catch (error) {
        console.error("Error checking location access:", error);
        setLocationCheck({ completed: false, loading: false });
      }
    };

    checkLocationAccess();
  }, [run, schoolId, isLoading, mode, navigate, toast]);

  if (isLoading || locationCheck.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" />
          Checking access permissions...
        </div>
      </div>
    );
  }

  // If locations are completed, don't render children
  if (locationCheck.completed) {
    return null;
  }

  // For mode-level completion checks
  if (mode === "bus" && run?.bus_completed) {
    return null;
  }
  
  if (mode === "classroom" && run?.status === "completed") {
    return null;
  }

  return <>{children}</>;
}