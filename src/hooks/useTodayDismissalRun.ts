
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
};

export const useTodayDismissalRun = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["today-dismissal-run", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ run: DismissalRun; schoolId: number }> => {
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

      // Find or create today's run
      const today = new Date().toISOString().slice(0, 10);

      const { data: existing, error: findErr } = await supabase
        .from("dismissal_runs")
        .select("*")
        .eq("school_id", schoolId)
        .eq("date", today)
        .in("status", ["active", "paused"]) // allow existing active-like runs
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        return { run: existing as DismissalRun, schoolId };
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("dismissal_runs")
        .insert({
          school_id: schoolId,
          started_by: user.id,
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      return { run: inserted as DismissalRun, schoolId };
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
