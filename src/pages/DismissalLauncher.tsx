
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
  const { run } = useTodayDismissalRun();

  const [schoolName, setSchoolName] = useState<string>('');
  const navigate = useNavigate();
  
  const isBusCompleted = run?.status === 'completed';
  
  // Format completion time for display
  const formatCompletionTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

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
        
        {/* Status Banner */}
        {isBusCompleted && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                      Bus Dismissal Completed
                    </span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      ✓ Done
                    </Badge>
                  </div>
                  {run?.ended_at && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Completed at {formatCompletionTime(run.ended_at)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
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
              variant="outline"
              className="h-32 text-lg justify-center flex-col gap-2"
              onClick={() => navigate("/dashboard/dismissal/car-line")}
            >
              <Car className="h-8 w-8" />
              Car Line Mode
            </Button>
            <Button
              variant="outline"
              className="h-32 text-lg justify-center flex-col gap-2"
              onClick={() => navigate("/dashboard/dismissal/walker")}
            >
              <MapPin className="h-8 w-8" />
              Walker Mode
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
