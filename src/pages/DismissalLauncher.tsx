
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { CheckCircle, Bus, Car, Users, MapPin, Clock } from "lucide-react";
import { DismissalRunTimeline } from "@/components/DismissalRunTimeline";
import { ModeCompletionButton } from "@/components/ModeCompletionButton";
import { TeacherUsageCard } from "@/components/TeacherUsageCard";

export default function DismissalLauncher() {
  const { signOut, user } = useAuth();
  const { run, schoolId, refetch } = useTodayDismissalRun();

  const [schoolName, setSchoolName] = useState<string>('');
  const [isBusCompleted, setIsBusCompleted] = useState(false);
  const [isCarLineCompleted, setIsCarLineCompleted] = useState(false);
  const [isWalkerCompleted, setIsWalkerCompleted] = useState(false);
  const navigate = useNavigate();

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

  // Remove the old completion checking functions
  // ... keep existing code (real-time update subscriptions)

  // Use new completion status from run
  useEffect(() => {
    if (run) {
      setIsBusCompleted(run.bus_completed || false);
      setIsCarLineCompleted(run.car_line_completed || false);
      setIsWalkerCompleted(run.walker_completed || false);
    }
  }, [run]);

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
        {/* Dismissal Status Info */}
        {run && (
          <div className="mb-6 max-w-5xl">
            <div className={`flex items-center gap-4 p-4 rounded-lg border ${
              run.status === 'completed' 
                ? 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900 dark:border-emerald-600 shadow-lg' 
                : 'bg-card/50'
            }`}>
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Dismissal Status</h3>
                  <Badge variant={
                    run.status === 'scheduled' ? 'outline' :
                    run.status === 'preparation' ? 'secondary' :
                    run.status === 'active' ? 'default' :
                    run.status === 'completed' ? 'success' : 'outline'
                  }>
                    {run.status === 'scheduled' && 'Scheduled'}
                    {run.status === 'preparation' && 'Preparation Phase'}
                    {run.status === 'active' && 'Active'}
                    {run.status === 'completed' && 'Completed'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {run.status === 'scheduled' && run.scheduled_start_time && 
                    `Dismissal scheduled for ${new Date(run.scheduled_start_time).toLocaleTimeString()}`}
                  {run.status === 'preparation' && 'Pre-staging allowed for all modes'}
                  {run.status === 'active' && 'Dismissal is currently in progress'}
                  {run.status === 'completed' && 'All dismissal activities have been completed'}
                </p>
              </div>
            </div>
          </div>
        )}

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
              variant="outline"
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                !run || (run.status !== 'preparation' && run.status !== 'active') 
                  ? 'opacity-50' : ''
              }`}
              onClick={() => navigate("/dashboard/dismissal/bus")}
              disabled={!run || (run.status !== 'preparation' && run.status !== 'active')}
            >
              <div className="flex items-center gap-2">
                <Bus className="h-8 w-8" />
                {isBusCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isBusCompleted ? "Bus Dismissal - Completed" : "Bus Dismissal Mode"}
            </Button>
            <Button
              variant="outline"
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                !run || (run.status !== 'preparation' && run.status !== 'active') 
                  ? 'opacity-50' : ''
              }`}
              onClick={() => navigate("/dashboard/dismissal/car-line")}
              disabled={!run || (run.status !== 'preparation' && run.status !== 'active')}
            >
              <div className="flex items-center gap-2">
                <Car className="h-8 w-8" />
                {isCarLineCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isCarLineCompleted ? "Car Line Mode - Completed" : "Car Line Mode"}
            </Button>
            <Button
              variant="outline"
              className={`h-32 text-lg justify-center flex-col gap-2 ${
                !run || (run.status !== 'preparation' && run.status !== 'active') 
                  ? 'opacity-50' : ''
              }`}
              onClick={() => navigate("/dashboard/dismissal/walker")}
              disabled={!run || (run.status !== 'preparation' && run.status !== 'active')}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-8 w-8" />
                {isWalkerCompleted && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              {isWalkerCompleted ? "Walker Mode - Completed" : "Walker Mode"}
            </Button>
          </div>
        </section>

        {/* Teacher Usage */}
        <section className="mt-6 max-w-5xl">
          <div className="w-full">
            <TeacherUsageCard schoolId={schoolId} />
          </div>
        </section>

        {/* End Dismissal Button */}
        {run && run.status !== 'completed' && (isBusCompleted && isCarLineCompleted && isWalkerCompleted) && (
          <section className="mt-6 max-w-5xl">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                      All Modes Completed
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-300 text-sm">
                      All dismissal modes have been completed. You can now end the dismissal run.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!run?.id || !user) return;
                      
                      try {
                        const { error } = await supabase
                          .from('dismissal_runs')
                          .update({ 
                            ended_at: new Date().toISOString(),
                            status: 'completed'
                          })
                          .eq('id', run.id);

                        if (error) throw error;

                        refetch(); // Refresh the run data
                      } catch (error) {
                        console.error('Error ending dismissal:', error);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    End Dismissal Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
        
        {/* Timeline Report */}
        <section className="mt-8 max-w-5xl">
          <DismissalRunTimeline />
        </section>
      </main>
    </>
  );
}
