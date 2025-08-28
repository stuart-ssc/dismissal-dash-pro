import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Calendar, BarChart3, Upload, Pause } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SetupChecklistCard from "@/components/SetupChecklistCard";
import { useSchoolSetupStatus } from "@/hooks/useSchoolSetupStatus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
const Dashboard = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const { run, schoolId, isLoading: runLoading } = useTodayDismissalRun();
  const [prepMinutes, setPrepMinutes] = useState<number | null>(null);
  const [planDismissalTime, setPlanDismissalTime] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const { loading: setupLoading, isReady, statuses } = useSchoolSetupStatus();
  const [recentDismissals, setRecentDismissals] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user) return;
      
      try {
        // Get user's profile to get school_id, first_name, and last_name
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');

          if (profile.school_id) {
            // Get school name
            const { data: school } = await supabase
              .from('schools')
              .select('school_name')
              .eq('id', profile.school_id)
              .single();

            if (school?.school_name) {
              setSchoolName(school.school_name);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school name:', error);
      }
    };

    fetchSchoolName();
  }, [user]);

  // Periodically update time to refresh button states
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch school's preparation time
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data } = await supabase
        .from('schools')
        .select('preparation_time_minutes')
        .eq('id', schoolId)
        .single();
      setPrepMinutes((data as any)?.preparation_time_minutes ?? 5);
    })();
  }, [schoolId]);

  // Fetch today's plan dismissal time
  useEffect(() => {
    const planId = run?.plan_id as string | null | undefined;
    if (!planId) {
      setPlanDismissalTime(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('dismissal_plans')
        .select('dismissal_time')
        .eq('id', planId)
        .single();
      setPlanDismissalTime((data as any)?.dismissal_time ?? null);
    })();
  }, [run?.plan_id]);

  // Fetch recent dismissals for chart
  useEffect(() => {
    const fetchRecentDismissals = async () => {
      if (!schoolId) return;
      
      try {
        const { data, error } = await supabase
          .from('dismissal_runs')
          .select('id, date, status, started_at, ended_at')
          .eq('school_id', schoolId)
          .order('date', { ascending: false })
          .limit(5);

        if (error) throw error;

        const chartData = data?.map((dismissal, index) => {
          const startTime = new Date(dismissal.started_at);
          const endTime = dismissal.ended_at ? new Date(dismissal.ended_at) : new Date();
          const elapsedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          
          return {
            name: format(new Date(dismissal.date), 'M-dd'),
            elapsed: elapsedMinutes,
            status: dismissal.status
          };
        }) || [];

        setRecentDismissals(chartData);
      } catch (error) {
        console.error('Error fetching recent dismissals:', error);
      }
    };

    fetchRecentDismissals();
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Debug: Log the current user role
  console.log('Current user role:', userRole);
  console.log('User object:', user);

  // Compute dismissal timing state
  const planStartDate = (() => {
    if (!planDismissalTime) return null;
    const parts = planDismissalTime.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const s = parseInt(parts[2] || '0', 10);
    const d = new Date(nowTs);
    d.setHours(h, m, s, 0);
    return d;
  })();

  const now = new Date(nowTs);
  const prep = prepMinutes ?? null;
  const showDismissalControls = !!planStartDate && prep !== null && now >= new Date(planStartDate.getTime() - (prep as number) * 60000) && run?.status !== 'completed';
  const afterStart = !!planStartDate && now >= planStartDate;

  // For school admins, show the sidebar layout
  if (userRole === 'school_admin') {
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
          {!setupLoading && !isReady && (
            <SetupChecklistCard statuses={statuses} />
          )}
          {showDismissalControls && (
            <section aria-label="Dismissal controls" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild size="lg" variant={afterStart ? "default" : "success"} className="w-full h-14 text-base">
                <Link to="/dashboard/dismissal">
                  {afterStart ? "Dismissal Has Already Begun Today" : "Launch Dismissal"}
                </Link>
              </Button>
              <Button size="lg" variant="softDestructive" className="w-full h-14 text-base">
                <Pause className="mr-2" />
                PAUSE DISMISSAL
              </Button>
            </section>
          )}
          <div className="relative">
            {!setupLoading && !isReady && (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these insights.</p>
              </div>
            )}
            <div aria-hidden={!setupLoading && !isReady ? true : undefined} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">245</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Dismissals</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">
                    Active dismissals
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">
                    This week
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Efficiency Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.2%</div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% from last week
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="relative">
            {!setupLoading && !isReady && (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these actions and activity.</p>
              </div>
            )}
            <div aria-hidden={!setupLoading && !isReady ? true : undefined} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks for school administrators
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/dashboard/dismissal">
                      <Users className="mr-2 h-4 w-4" />
                      Launch Dismissal
                    </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Dismissal Groups
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Reports
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/dashboard/import">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Roster
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Recent Dismissals</CardTitle>
                  <CardDescription>
                    Elapsed time for the 5 most recent dismissals (minutes)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentDismissals.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={recentDismissals}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            fontSize={12}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            label={{ 
                              value: 'Minutes', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                            }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                            formatter={(value: number) => [`${value} min`, 'Elapsed Time']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Bar 
                            dataKey="elapsed" 
                            fill="hsl(var(--primary))"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">No recent dismissals found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </>
    );
  }

  // For non-admin users, show the original layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {schoolName ? `${schoolName} ` : ''}Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome {firstName} {lastName}
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        {showDismissalControls && (
          <section aria-label="Dismissal controls" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button asChild size="lg" variant={afterStart ? "default" : "success"} className="w-full h-14 text-base">
              <Link to="/dashboard/dismissal">
                {afterStart ? "Dismissal Has Already Begun Today" : "Launch Dismissal"}
              </Link>
            </Button>
            <Button size="lg" variant="softDestructive" className="w-full h-14 text-base">
              Pause
            </Button>
          </section>
        )}

        <div className="relative mb-8">
          {!setupLoading && !isReady && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these insights.</p>
            </div>
          )}
          <div aria-hidden={!setupLoading && !isReady ? true : undefined} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Dismissals</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-muted-foreground">
                  Active dismissals
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  This week
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.2%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last week
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="relative">
          {!setupLoading && !isReady && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these actions and activity.</p>
            </div>
          )}
          <div aria-hidden={!setupLoading && !isReady ? true : undefined} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for {userRole === 'teacher' ? 'teachers' : 'users'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                {userRole === 'teacher' && (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      Manage My Classes
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Update Dismissal Plans
                    </Button>
                  </>
                )}
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/dashboard/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Roster
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Recent Dismissals</CardTitle>
                <CardDescription>
                  Elapsed time for the 5 most recent dismissals (minutes)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentDismissals.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recentDismissals}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          label={{ 
                            value: 'Minutes', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value: number) => [`${value} min`, 'Elapsed Time']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Bar 
                          dataKey="elapsed" 
                          fill="hsl(var(--primary))"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No recent dismissals found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;