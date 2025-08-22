
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

      // Find or create today's run and ensure it has today's plan
      const today = new Date().toISOString().slice(0, 10);

      // 1) Select today's plan (date-specific) or default
      let selectedPlanId: string | null = null;

      // Try date-specific or open-ended active plan
      const { data: datePlan, error: datePlanErr } = await supabase
        .from("dismissal_plans")
        .select("id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .or(
          `and(start_date.lte.${today},end_date.gte.${today}),` +
          `and(start_date.lte.${today},end_date.is.null),` +
          `and(start_date.is.null,end_date.gte.${today}),` +
          `and(start_date.is.null,end_date.is.null)`
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (datePlanErr) {
        console.warn("Error fetching date-specific plan:", datePlanErr.message);
      }
      if (datePlan?.id) {
        selectedPlanId = datePlan.id;
      } else {
        const { data: defaultPlan, error: defaultPlanErr } = await supabase
          .from("dismissal_plans")
          .select("id")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .eq("is_default", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (defaultPlanErr) {
          console.warn("Error fetching default plan:", defaultPlanErr.message);
        }
        selectedPlanId = defaultPlan?.id ?? null;
      }

      // 2) Find existing run (any status - only one run per day allowed)
      const { data: existing, error: findErr } = await supabase
        .from("dismissal_runs")
        .select("*")
        .eq("school_id", schoolId)
        .eq("date", today)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        // If run is completed, return as-is (no modifications allowed)
        if (existing.status === 'completed') {
          return { run: existing as DismissalRun, schoolId };
        }
        
        // If run exists without a plan, attach the selected plan (idempotent)
        if (!existing.plan_id && selectedPlanId) {
          const { data: updated, error: updateErr } = await supabase
            .from("dismissal_runs")
            .update({ plan_id: selectedPlanId })
            .eq("id", existing.id)
            .select("*")
            .single();
          if (updateErr) throw updateErr;
          return { run: updated as DismissalRun, schoolId };
        }
        return { run: existing as DismissalRun, schoolId };
      }

      // 3) Create new run with plan if available (only if no run exists for today)
      const { data: inserted, error: insertErr } = await supabase
        .from("dismissal_runs")
        .insert({
          school_id: schoolId,
          started_by: user.id,
          plan_id: selectedPlanId,
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
