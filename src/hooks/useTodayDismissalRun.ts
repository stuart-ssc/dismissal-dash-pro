
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useMultiSchool } from "@/hooks/useMultiSchool";

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
  testing_mode: boolean;
  dismissal_time?: string | null;
};

export const useTodayDismissalRun = (options?: { allowCreate?: boolean }) => {
  const { user } = useAuth();
  const { impersonatedSchoolId } = useImpersonation();
  const { activeSchoolId } = useMultiSchool();
  const allowCreate = options?.allowCreate ?? false;

  const query = useQuery({
    queryKey: ["today-dismissal-run", user?.id, impersonatedSchoolId, activeSchoolId, allowCreate],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ run: DismissalRun | null; schoolId: number; planTimeFallback?: string | null } | null> => {
      if (!user?.id) throw new Error("Not authenticated");

      let schoolId: number;

      // Priority 1: Impersonated school (for system admins)
      if (impersonatedSchoolId) {
        schoolId = impersonatedSchoolId;
      }
      // Priority 2: Active school from multi-school context
      else if (activeSchoolId) {
        schoolId = activeSchoolId;
      }
      // Priority 3: Fallback to profile school_id
      else {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.school_id) throw new Error("User has no school assigned");
        schoolId = profile.school_id;
      }

      // Get school timezone for accurate date calculation
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("timezone")
        .eq("id", schoolId)
        .maybeSingle();

      if (schoolError) throw schoolError;
      
      const timezone = school?.timezone || 'America/New_York';
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());

      // Get current academic session for filtering
      const { data: currentSession } = await supabase
        .from("academic_sessions")
        .select("id")
        .eq("school_id", schoolId)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .maybeSingle();

      const currentSessionId = currentSession?.id || null;

      console.log(`[useTodayDismissalRun] Fetching runs for school ${schoolId}, date ${today}, session ${currentSessionId}`);

      // Fetch ALL existing runs for today (not just one), filtered by current session
      const { data: allRuns, error: findErr } = await supabase
        .from("dismissal_runs")
        .select("*")
        .eq("school_id", schoolId)
        .eq("date", today)
        .eq("academic_session_id", currentSessionId)
        .order('updated_at', { ascending: false });

      if (findErr) throw findErr;

      console.log(`[useTodayDismissalRun] Found ${allRuns?.length || 0} runs for today`);

      // Select the "best" candidate: prioritize runs with plan_id, then non-completed, then anything
      let existing: typeof allRuns extends (infer U)[] ? U : never | null = null;
      if (allRuns && allRuns.length > 0) {
        // First try to find a run with a plan_id
        existing = allRuns.find(r => r.plan_id) || null;
        // If none with plan_id, pick the first non-completed
        if (!existing) {
          existing = allRuns.find(r => r.status !== 'completed') || null;
        }
        // Otherwise just take the most recent
        if (!existing) {
          existing = allRuns[0];
        }
      }

      console.log(`[useTodayDismissalRun] Selected run:`, existing?.id, existing?.status);

      if (existing) {
        // Fetch dismissal plan separately if plan_id exists
        let dismissalTime = null;
        if (existing.plan_id) {
          console.log("Fetching dismissal plan for teacher, plan_id:", existing.plan_id);
          const { data: plan, error: planError } = await supabase
            .from("dismissal_plans")
            .select("dismissal_time")
            .eq("id", existing.plan_id)
            .maybeSingle();
          
          console.log("Dismissal plan fetch result:", { plan, planError });
          
          if (planError) {
            console.error("Error fetching dismissal plan:", planError);
          }
          
          if (plan) {
            dismissalTime = plan.dismissal_time;
          }
        }

        const runWithDismissalTime = {
          ...existing,
          dismissal_time: dismissalTime
        } as DismissalRun;

        // Status transitions are handled by the dismissal-scheduler edge function
        // and the database trigger - no manual updates needed here
        console.log('[useTodayDismissalRun] Current run:', {
          id: runWithDismissalTime.id,
          status: runWithDismissalTime.status,
          scheduled_start_time: runWithDismissalTime.scheduled_start_time,
          preparation_start_time: runWithDismissalTime.preparation_start_time,
          current_time: new Date().toISOString()
        });
        
        return { run: runWithDismissalTime, schoolId };
      }

      // If no run exists, fetch the applicable dismissal plan as fallback
      console.log(`[useTodayDismissalRun] No existing run, fetching applicable plan for today`);
      let planTimeFallback: string | null = null;
      
      // PRIORITY 1: Try to find a date-specific plan for today (filtered by session)
      // Date-specific plans have start_date NOT NULL
      const { data: dateSpecificPlan, error: dateSpecificErr } = await supabase
        .from("dismissal_plans")
        .select("dismissal_time")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .eq("academic_session_id", currentSessionId)
        .not("start_date", "is", null) // Must have a start date (date-specific)
        .or(`and(start_date.lte.${today},end_date.gte.${today}),and(start_date.lte.${today},end_date.is.null)`)
        .order("start_date", { ascending: false }) // Most recent date-specific plan first
        .limit(1)
        .maybeSingle();

      if (!dateSpecificErr && dateSpecificPlan) {
        planTimeFallback = dateSpecificPlan.dismissal_time;
        console.log(`[useTodayDismissalRun] Found date-specific plan with time:`, planTimeFallback);
      } else {
        // PRIORITY 2: Fallback to default plan if no date-specific plan found (filtered by session)
        const { data: defaultPlan, error: defaultErr } = await supabase
          .from("dismissal_plans")
          .select("dismissal_time")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .eq("is_default", true)
          .eq("academic_session_id", currentSessionId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!defaultErr && defaultPlan) {
          planTimeFallback = defaultPlan.dismissal_time;
          console.log(`[useTodayDismissalRun] Found default plan with time:`, planTimeFallback);
        }
      }

      // Only try to create a run if allowCreate is true and we have a plan
      if (!allowCreate) {
        console.log(`[useTodayDismissalRun] allowCreate=false, returning with planTimeFallback`);
        return { run: null, schoolId, planTimeFallback };
      }

      if (!planTimeFallback) {
        console.log(`[useTodayDismissalRun] No plan found, cannot create run`);
        return { run: null, schoolId, planTimeFallback: null };
      }

      // Check if we're within the 30-minute pre-dismissal window before creating
      // Get school's preparation time setting (default 5 minutes)
      const { data: schoolConfig } = await supabase
        .from('schools')
        .select('preparation_time_minutes, timezone')
        .eq('id', schoolId)
        .maybeSingle();

      const prepMinutes = schoolConfig?.preparation_time_minutes || 5;
      const schoolTz = schoolConfig?.timezone || 'America/New_York';

      // Calculate when preparation window opens using the DB function
      const { data: times, error: timesError } = await supabase
        .rpc('calculate_dismissal_times', {
          plan_dismissal_time: planTimeFallback,
          preparation_minutes: prepMinutes,
          school_timezone: schoolTz,
          target_date: today
        });

      if (timesError || !times || times.length === 0) {
        console.warn('[useTodayDismissalRun] Could not calculate dismissal times:', timesError);
        return { run: null, schoolId, planTimeFallback };
      }

      const { preparation_start_time } = times[0];
      const now = new Date();
      const prepStart = new Date(preparation_start_time);

      // Only create the run if we're at or past the preparation window
      if (now < prepStart) {
        console.log(`[useTodayDismissalRun] Not yet in preparation window. Prep starts at ${prepStart.toISOString()}, current time is ${now.toISOString()}`);
        return { run: null, schoolId, planTimeFallback };
      }

      // Try to create scheduled run using the database function
      console.log(`[useTodayDismissalRun] Within preparation window, attempting to create scheduled run`);
      try {
        const { data: runId, error: createError } = await supabase
          .rpc('create_scheduled_dismissal_run', {
            target_school_id: schoolId,
            target_date: today
          });

        if (createError) {
          console.warn("Could not create scheduled run:", createError.message);
          return { run: null, schoolId, planTimeFallback };
        }

        if (runId) {
          // Fetch the created run without embedded join
          const { data: newRun, error: fetchErr } = await supabase
            .from("dismissal_runs")
            .select("*")
            .eq("id", runId)
            .maybeSingle();

          if (fetchErr) {
            console.error("Error fetching newly created dismissal run:", fetchErr);
            throw fetchErr;
          }
          
          if (!newRun) {
            console.error("Newly created dismissal run not found (RLS issue?)");
            return null;
          }
          
          // Fetch plan separately if needed
          let dismissalTime = null;
          if (newRun.plan_id) {
            const { data: plan, error: planError } = await supabase
              .from("dismissal_plans")
              .select("dismissal_time")
              .eq("id", newRun.plan_id)
              .maybeSingle();
            
            if (planError) {
              console.error("Error fetching dismissal plan:", planError);
            }
            
            if (plan) {
              dismissalTime = plan.dismissal_time;
            }
          }
          
          const newRunWithDismissalTime = {
            ...newRun,
            dismissal_time: dismissalTime
          } as DismissalRun;
          
          console.log(`[useTodayDismissalRun] Successfully created and fetched new run`);
          return { run: newRunWithDismissalTime, schoolId, planTimeFallback };
        }
      } catch (error) {
        console.warn("[useTodayDismissalRun] Error creating scheduled run:", error);
      }

      console.log(`[useTodayDismissalRun] Could not create run, returning with planTimeFallback`);
      return { run: null, schoolId, planTimeFallback };
    },
  });

  return {
    run: query.data?.run ?? null,
    schoolId: query.data?.schoolId,
    planTimeFallback: query.data?.planTimeFallback,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
