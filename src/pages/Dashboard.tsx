import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Calendar, BarChart3, Upload, Clock } from "lucide-react";
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
  
  const SEO = useSEO();
  const { run, schoolId, isLoading: runLoading } = useTodayDismissalRun();
  const [prepMinutes, setPrepMinutes] = useState<number | null>(null);
  const [planDismissalTime, setPlanDismissalTime] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const { loading: setupLoading, isReady, statuses } = useSchoolSetupStatus();
  const [recentDismissals, setRecentDismissals] = useState<any[]>([]);
  const [avgDismissals, setAvgDismissals] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [fastestDismissal, setFastestDismissal] = useState<{date: string, duration: number} | null>(null);

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

  // Fetch recent dismissals for chart and average calculation
  useEffect(() => {
    const fetchRecentDismissals = async () => {
      if (!schoolId) return;
      
      try {
        // Fetch up to 10 for average calculation
        const { data: avgData, error: avgError } = await supabase
          .from('dismissal_runs')
          .select('id, date, status, started_at, ended_at')
          .eq('school_id', schoolId)
          .not('ended_at', 'is', null)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(10);

        if (avgError) throw avgError;

        // Fetch last 5 for chart display
        const { data: chartData, error: chartError } = await supabase
          .from('dismissal_runs')
          .select('id, date, status, started_at, ended_at')
          .eq('school_id', schoolId)
          .not('ended_at', 'is', null)
          .eq('status', 'completed')
          .order('date', { ascending: true })
          .limit(5);

        if (chartError) throw chartError;

        // Process chart data (last 5 for display)
        const processedChartData = chartData?.map((dismissal, index) => {
          const startTime = new Date(dismissal.started_at);
          const endTime = new Date(dismissal.ended_at);
          const elapsedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          
          return {
            name: format(new Date(dismissal.date), 'M-dd'),
            elapsed: elapsedMinutes,
            status: dismissal.status
          };
        }) || [];

        // Process average data (up to 10 for calculation)
        const processedAvgData = avgData?.map((dismissal) => {
          const startTime = new Date(dismissal.started_at);
          const endTime = new Date(dismissal.ended_at);
          const elapsedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          
          return {
            name: format(new Date(dismissal.date), 'M-dd'),
            elapsed: elapsedMinutes,
            status: dismissal.status
          };
        }) || [];

        // Set chart data for display and store avg data separately
        setRecentDismissals(processedChartData);
        setAvgDismissals(processedAvgData);
      } catch (error) {
        console.error('Error fetching recent dismissals:', error);
      }
    };

    fetchRecentDismissals();
  }, [schoolId]);

  // Fetch student count for the school
  useEffect(() => {
    const fetchStudentCount = async () => {
      if (!schoolId) return;
      
      try {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        if (error) throw error;
        setStudentCount(count || 0);
      } catch (error) {
        console.error('Error fetching student count:', error);
        setStudentCount(0);
      }
    };

    fetchStudentCount();
  }, [schoolId]);

  // Fetch fastest dismissal from current quarter
  useEffect(() => {
    const fetchFastestDismissal = async () => {
      if (!schoolId) return;
      
      try {
        // Calculate current quarter start date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);
        const quarterStartDateStr = quarterStartDate.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('dismissal_runs')
          .select('date, started_at, ended_at')
          .eq('school_id', schoolId)
          .eq('status', 'completed')
          .not('ended_at', 'is', null)
          .gte('date', quarterStartDateStr)
          .order('date', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Find the fastest dismissal (shortest duration)
          let fastest = null;
          let shortestDuration = Infinity;

          data.forEach((dismissal) => {
            const startTime = new Date(dismissal.started_at);
            const endTime = new Date(dismissal.ended_at);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            
            if (duration < shortestDuration) {
              shortestDuration = duration;
              fastest = {
                date: dismissal.date,
                duration: duration
              };
            }
          });

          setFastestDismissal(fastest);
        } else {
          setFastestDismissal(null);
        }
      } catch (error) {
        console.error('Error fetching fastest dismissal:', error);
        setFastestDismissal(null);
      }
    };

    fetchFastestDismissal();
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
        <SEO />
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
            <section aria-label="Dismissal controls">
              <Button asChild size="lg" variant={afterStart ? "default" : "success"} className="w-full h-14 text-base">
                <Link to="/dashboard/dismissal">
                  {afterStart ? "Dismissal Has Already Begun Today" : "Launch Dismissal"}
                </Link>
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
                  <CardTitle className="text-sm font-medium">Today's Dismissal Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {planDismissalTime ? (
                    <>
                      <div className="text-2xl font-bold">
                        {new Date(`2000-01-01T${planDismissalTime}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scheduled for today
                      </p>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/dashboard/dismissal-plans">
                          Manage Dismissal Plans
                        </Link>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        No plan set for today
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studentCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Total students in school
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Dismissal Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgDismissals.length > 0 
                      ? Math.round(avgDismissals.reduce((sum, d) => sum + d.elapsed, 0) / avgDismissals.length)
                      : 0
                    } min
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {avgDismissals.length >= 10 
                      ? "Rolling average (10 dismissals)"
                      : `Last ${avgDismissals.length} dismissals`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fastest Dismissal This Qtr</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {fastestDismissal ? (
                    <>
                      <div className="text-2xl font-bold">{fastestDismissal.duration} min</div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(fastestDismissal.date), 'MMM d, yyyy')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">--</div>
                      <p className="text-xs text-muted-foreground">
                        No data this quarter
                      </p>
                    </>
                  )}
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
    <>
      <SEO />
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
          <section aria-label="Dismissal controls" className="mb-8">
            <Button asChild size="lg" variant={afterStart ? "default" : "success"} className="w-full h-14 text-base">
              <Link to="/dashboard/dismissal">
                {afterStart ? "Dismissal Has Already Begun Today" : "Launch Dismissal"}
              </Link>
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
                <CardTitle className="text-sm font-medium">Today's Dismissal Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {planDismissalTime ? (
                  <>
                    <div className="text-2xl font-bold">
                      {new Date(`2000-01-01T${planDismissalTime}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scheduled for today
                    </p>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/dismissal-plans">
                        Manage Dismissal Plans
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      No plan set for today
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentCount}</div>
                <p className="text-xs text-muted-foreground">
                  Total students in school
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Dismissal Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgDismissals.length > 0 
                    ? Math.round(avgDismissals.reduce((sum, d) => sum + d.elapsed, 0) / avgDismissals.length)
                    : 0
                  } min
                </div>
                <p className="text-xs text-muted-foreground">
                  {avgDismissals.length >= 10 
                    ? "Rolling average (10 dismissals)"
                    : `Last ${avgDismissals.length} dismissals`
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fastest Dismissal This Qtr</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {fastestDismissal ? (
                  <>
                    <div className="text-2xl font-bold">{fastestDismissal.duration} min</div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(fastestDismissal.date), 'MMM d, yyyy')}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">
                      No data this quarter
                    </p>
                  </>
                )}
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
    </>
  );
};

export default Dashboard;