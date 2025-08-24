
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { CheckCircle, Bus, Car, Users, MapPin } from "lucide-react";
import { DismissalRunTimeline } from "@/components/DismissalRunTimeline";

export default function DismissalLauncher() {
  const { signOut, user } = useAuth();
  const { run, refetch } = useTodayDismissalRun();

  const [schoolName, setSchoolName] = useState<string>('');
  const [isCarLineCompleted, setIsCarLineCompleted] = useState(false);
  const [isWalkerCompleted, setIsWalkerCompleted] = useState(false);
  const navigate = useNavigate();
  
  const isBusCompleted = run?.status === 'completed';

  useEffect(() => {
    document.title = "Launch Dismissal | Dashboard";
  }, []);

  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        if (profile?.school_id) {
          const { data: school } = await supabase
            .from('schools')
            .select('school_name')
            .eq('id', profile.school_id)
            .single();
          if (school?.school_name) setSchoolName(school.school_name);
        }
      } catch (e) {
        console.error('Error fetching school name:', e);
      }
    };
    fetchSchoolName();
  }, [user]);

  // Check car line completion status
  const checkCarLineCompletion = async () => {
    if (!run?.id || !run?.plan_id) return;
    
    try {
      // Get all car line groups from the active dismissal plan
      const { data: carLineGroups } = await supabase
        .from('dismissal_groups')
        .select(`
          id,
          dismissal_group_car_lines (
            car_line_id
          )
        `)
        .eq('dismissal_plan_id', run.plan_id)
        .eq('group_type', 'car');

      if (!carLineGroups || carLineGroups.length === 0) {
        setIsCarLineCompleted(false);
        return;
      }

      // Get all unique car line IDs
      const carLineIds = carLineGroups
        .flatMap(group => group.dismissal_group_car_lines)
        .map(dcl => dcl.car_line_id);

      if (carLineIds.length === 0) {
        setIsCarLineCompleted(false);
        return;
      }

      // Check if all car lines have finished sessions for today's dismissal run
      const { data: sessions } = await supabase
        .from('car_line_sessions')
        .select('car_line_id, finished_at')
        .eq('dismissal_run_id', run.id)
        .in('car_line_id', carLineIds);

      if (!sessions || sessions.length === 0) {
        setIsCarLineCompleted(false);
        return;
      }

      // Check if all car lines have finished sessions
      const finishedCarLineIds = sessions
        .filter(session => session.finished_at)
        .map(session => session.car_line_id);

      const allCarLinesCompleted = carLineIds.every(id => finishedCarLineIds.includes(id));
      setIsCarLineCompleted(allCarLinesCompleted);
    } catch (error) {
      console.error('Error checking car line completion:', error);
    }
  };

  // Check walker completion status
  const checkWalkerCompletion = async () => {
    if (!run?.id || !run?.plan_id) return;
    
    try {
      // Get all walker groups from the active dismissal plan
      const { data: walkerGroups } = await supabase
        .from('dismissal_groups')
        .select('id, walker_location_id')
        .eq('dismissal_plan_id', run.plan_id)
        .eq('group_type', 'walker')
        .not('walker_location_id', 'is', null);

      if (!walkerGroups || walkerGroups.length === 0) {
        setIsWalkerCompleted(false);
        return;
      }

      // Get all unique walker location IDs
      const walkerLocationIds = walkerGroups
        .map(group => group.walker_location_id)
        .filter(id => id !== null);

      if (walkerLocationIds.length === 0) {
        setIsWalkerCompleted(false);
        return;
      }

      // Check if all walker locations have finished sessions for today's dismissal run
      const { data: sessions } = await supabase
        .from('walker_sessions')
        .select('walker_location_id, finished_at')
        .eq('dismissal_run_id', run.id)
        .in('walker_location_id', walkerLocationIds);

      if (!sessions || sessions.length === 0) {
        setIsWalkerCompleted(false);
        return;
      }

      // Check if all walker locations have finished sessions
      const finishedWalkerLocationIds = sessions
        .filter(session => session.finished_at)
        .map(session => session.walker_location_id);

      const allWalkersCompleted = walkerLocationIds.every(id => finishedWalkerLocationIds.includes(id));
      setIsWalkerCompleted(allWalkersCompleted);
    } catch (error) {
      console.error('Error checking walker completion:', error);
    }
  };

  // Check completion status when run changes
  useEffect(() => {
    if (run?.id && run?.plan_id) {
      checkCarLineCompletion();
      checkWalkerCompletion();
    }
  }, [run?.id, run?.plan_id]);

  // Real-time updates for dismissal runs
  useEffect(() => {
    if (!run?.id) return;
    
    const channel = supabase
      .channel('dismissal-runs-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'dismissal_runs',
          filter: `id=eq.${run.id}`
        },
        () => {
          // Refetch dismissal run data when status changes
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [run?.id, refetch]);

  // Real-time updates for car line sessions
  useEffect(() => {
    if (!run?.id) return;
    
    const channel = supabase
      .channel('car-line-sessions-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'car_line_sessions',
          filter: `dismissal_run_id=eq.${run.id}`
        },
        () => {
          checkCarLineCompletion();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [run?.id]);

  // Real-time updates for walker sessions
  useEffect(() => {
    if (!run?.id) return;
    
    const channel = supabase
      .channel('walker-sessions-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'walker_sessions',
          filter: `dismissal_run_id=eq.${run.id}`
        },
        () => {
          checkWalkerCompletion();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [run?.id]);
  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">{schoolName || '—'}</h1>
        </div>
        <Button onClick={signOut} variant="outline">Sign Out</Button>
      </header>

      <main className="flex-1 p-6">
        <h2 className="text-3xl font-bold mb-6">Launch Dismissal</h2>
        <section aria-labelledby="dismissal-modes" className="max-w-5xl">
          <h2 id="dismissal-modes" className="sr-only">Dismissal Modes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Button
              variant="outline"
              className="h-32 text-lg justify-center flex-col gap-2"
              onClick={() => navigate("/dashboard/dismissal/classroom")}
            >
              <Users className="h-8 w-8" />
              Classroom Mode
            </Button>
            <Button
              variant={isBusCompleted ? "secondary" : "outline"}
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                isBusCompleted 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 cursor-not-allowed" 
                  : ""
              }`}
              onClick={() => !isBusCompleted && navigate("/dashboard/dismissal/bus")}
              disabled={isBusCompleted}
            >
              <div className="flex items-center gap-2">
                <Bus className="h-8 w-8" />
                {isBusCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isBusCompleted ? "Bus Dismissal - Completed" : "Bus Dismissal Mode"}
            </Button>
            <Button
              variant={isCarLineCompleted ? "secondary" : "outline"}
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                isCarLineCompleted 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 cursor-not-allowed" 
                  : ""
              }`}
              onClick={() => !isCarLineCompleted && navigate("/dashboard/dismissal/car-line")}
              disabled={isCarLineCompleted}
            >
              <div className="flex items-center gap-2">
                <Car className="h-8 w-8" />
                {isCarLineCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isCarLineCompleted ? "Car Line Mode - Completed" : "Car Line Mode"}
            </Button>
            <Button
              variant={isWalkerCompleted ? "secondary" : "outline"}
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                isWalkerCompleted 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 cursor-not-allowed" 
                  : ""
              }`}
              onClick={() => !isWalkerCompleted && navigate("/dashboard/dismissal/walker")}
              disabled={isWalkerCompleted}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-8 w-8" />
                {isWalkerCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isWalkerCompleted ? "Walker Mode - Completed" : "Walker Mode"}
            </Button>
          </div>
        </section>
        
        {/* Timeline Report */}
        <section className="mt-8 max-w-5xl">
          <DismissalRunTimeline />
        </section>
      </main>
    </>
  );
}
