import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ClipboardList, Bus, Calendar, PlayCircle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function DismissalsHub() {
  const { user, signOut } = useAuth();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const { run } = useTodayDismissalRun();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      const sid = profile?.school_id ?? null;
      setSchoolId(sid);
      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      
      if (sid) {
        const { data: school } = await supabase
          .from('schools')
          .select('school_name')
          .eq('id', sid)
          .single();
        
        setSchoolName(school?.school_name ?? "");
      }
    };
    fetchData();
  }, [user]);

  const { data: stats } = useQuery({
    queryKey: ["dismissals-hub-stats", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const today = new Date().toISOString().split('T')[0];

      const [plansCount, busesCount, carLinesCount, walkersCount, specialRunsCount, studentsCount] = await Promise.all([
        supabase.from('dismissal_plans').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('buses').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('car_lines').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('walker_locations').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('special_use_runs').select('id', { count: 'exact', head: true }).gte('run_date', today),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      ]);

      return {
        activePlans: plansCount.count || 0,
        totalTransportation: (busesCount.count || 0) + (carLinesCount.count || 0) + (walkersCount.count || 0),
        scheduledRuns: specialRunsCount.count || 0,
        totalStudents: studentsCount.count || 0,
      };
    },
    enabled: !!schoolId,
  });

  const getStatusBadge = () => {
    if (!run) return <Badge variant="outline">No Run Today</Badge>;
    if (run.status === 'completed') return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    if (run.started_at) return <Badge variant="default"><PlayCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const navigationCards = [
    {
      title: "Today's Active Dismissal",
      description: run 
        ? `${run.status === 'completed' ? 'View completed' : 'Launch or continue'} today's dismissal run`
        : "No dismissal scheduled for today",
      icon: PlayCircle,
      href: "/dashboard/dismissal",
      stat: run ? format(new Date(), 'MMM d, yyyy') : null,
      badge: getStatusBadge(),
      featured: true,
    },
    {
      title: "Dismissal Plans",
      description: "Create and manage dismissal plans and schedules",
      icon: ClipboardList,
      href: "/dashboard/dismissals/plans",
      stat: stats?.activePlans,
      statLabel: "Active Plans",
    },
    {
      title: "Transportation",
      description: "Manage buses, car lines, walker locations, and after-school activities",
      icon: Bus,
      href: "/dashboard/dismissals/transportation",
      stat: stats?.totalTransportation,
      statLabel: "Transportation Modes",
    },
    {
      title: "Special Runs",
      description: "Schedule and manage special transportation for field trips, athletics, and events",
      icon: Calendar,
      href: "/dashboard/dismissals/special-runs",
      stat: stats?.scheduledRuns,
      statLabel: "Scheduled Runs",
    },
  ];

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">
              {schoolName ? `${schoolName} ` : ''}Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome {firstName} {lastName}
            </p>
          </div>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activePlans ?? '-'}</div>
              <p className="text-xs text-muted-foreground">Dismissal plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transportation</CardTitle>
              <Bus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTransportation ?? '-'}</div>
              <p className="text-xs text-muted-foreground">Buses, car lines, walkers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Runs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.scheduledRuns ?? '-'}</div>
              <p className="text-xs text-muted-foreground">Special runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents ?? '-'}</div>
              <p className="text-xs text-muted-foreground">Total in dismissal</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => (
            <Link key={card.href} to={card.href}>
              <Card className={`transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full ${card.featured ? 'border-primary bg-gradient-to-br from-primary/5 to-secondary/5' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <card.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                    {card.badge}
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                {card.stat !== null && (
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{card.stat}</span>
                      {card.statLabel && <span className="text-sm text-muted-foreground">{card.statLabel}</span>}
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
