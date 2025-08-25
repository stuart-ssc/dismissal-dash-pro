
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DismissalRun = {
  id: string;
  school_id: number;
  date: string;
  status: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  plan_id: string | null;
  scheduled_start_time: string | null;
  preparation_start_time: string | null;
  bus_completed: boolean;
  car_line_completed: boolean;
  walker_completed: boolean;
  bus_completed_at: string | null;
  car_line_completed_at: string | null;
  walker_completed_at: string | null;
  bus_completed_by: string | null;
  car_line_completed_by: string | null;
  walker_completed_by: string | null;
};

export const useTodayDismissalRun = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["today-dismissal-run", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ run: DismissalRun; schoolId: number } | null> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get user's school
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      const schoolId = profile?.school_id;
      if (!schoolId) throw new Error("User has no school assigned");

      const today = new Date().toISOString().slice(0, 10);

      // Only fetch existing run - don't create new ones
      const { data: existing, error: findErr } = await supabase
        .from("dismissal_runs")
        .select("*")
        .eq("school_id", schoolId)
        .eq("date", today)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        return { run: existing as DismissalRun, schoolId };
      }

      // Try to create scheduled run using the database function
      try {
        const { data: runId, error: createError } = await supabase
          .rpc('create_scheduled_dismissal_run', {
            target_school_id: schoolId,
            target_date: today
          });

        if (createError) {
          console.warn("Could not create scheduled run:", createError.message);
          return null;
        }

        if (runId) {
          // Fetch the created run
          const { data: newRun, error: fetchErr } = await supabase
            .from("dismissal_runs")
            .select("*")
            .eq("id", runId)
            .single();

          if (fetchErr) throw fetchErr;
          return { run: newRun as DismissalRun, schoolId };
        }
      } catch (error) {
        console.warn("Error creating scheduled run:", error);
      }

      return null;
    },
  });

  return {
    run: query.data?.run,
    schoolId: query.data?.schoolId,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
