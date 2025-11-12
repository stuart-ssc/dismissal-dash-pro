import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Calendar, BarChart3, Upload, Clock, RotateCcw, AlertCircle, CalendarDays, UserX } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SetupChecklistCard from "@/components/SetupChecklistCard";
import TeacherSetupGuide from "@/components/TeacherSetupGuide";
import { useSchoolSetupStatus } from "@/hooks/useSchoolSetupStatus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { resetDismissalRun } from "@/lib/resetDismissalRun";
import { deleteTodayDismissal } from "@/lib/deleteTodayDismissal";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTodayDismissalRun as useDismissalRunRefetch } from "@/hooks/useTodayDismissalRun";
import { ICSyncStatusWidget } from "@/components/ICSyncStatusWidget";
import { ICDashboardSummary } from "@/components/ICDashboardSummary";
import { SchoolSetupMethodDialog } from "@/components/SchoolSetupMethodDialog";
import { ICSetupDialog } from "@/components/ICSetupDialog";

const Dashboard = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  
  const SEO = useSEO();
  const { run, schoolId, planTimeFallback, isLoading: runLoading } = useTodayDismissalRun();
  const [prepMinutes, setPrepMinutes] = useState<number | null>(null);
  
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const { loading: setupLoading, isReady, statuses } = useSchoolSetupStatus();
  const [recentDismissals, setRecentDismissals] = useState<any[]>([]);
  const [avgDismissals, setAvgDismissals] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [fastestDismissal, setFastestDismissal] = useState<{date: string, duration: number} | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSetupMethodDialog, setShowSetupMethodDialog] = useState(false);
  const [showICSetupDialog, setShowICSetupDialog] = useState(false);
  const [hasICConnection, setHasICConnection] = useState(false);
  const [checkingICConnection, setCheckingICConnection] = useState(true);

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
          .maybeSingle();

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');

          if (profile.school_id) {
            // Get school name
            const { data: school } = await supabase
              .from('schools')
              .select('school_name')
              .eq('id', profile.school_id)
              .maybeSingle();

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

  // Check for auto-timeout on mount and periodically
  useEffect(() => {
    const checkAutoTimeout = async () => {
      if (!user || !run || run.status === 'completed') return;

      try {
        const { data, error } = await supabase.functions.invoke('complete-today-run-if-timeout');
        
        if (error) {
          console.error('Error checking auto-timeout:', error);
          return;
        }

        // If the run was completed, refetch the dismissal run
        if (data?.completed) {
          console.log('Dismissal run auto-completed, refetching...');
          // Trigger a refetch by updating a state or using the refetch function if available
          window.location.reload();
        }
      } catch (error) {
        console.error('Exception checking auto-timeout:', error);
      }
    };

    // Check on mount
    checkAutoTimeout();

    // Check every 60 seconds
    const intervalId = setInterval(checkAutoTimeout, 60000);

    return () => clearInterval(intervalId);
  }, [user, run]);

  // Fetch school's preparation time
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data } = await supabase
        .from('schools')
        .select('preparation_time_minutes')
        .eq('id', schoolId)
        .maybeSingle();
      setPrepMinutes((data as any)?.preparation_time_minutes ?? 5);
    })();
  }, [schoolId]);


  // Fetch recent dismissals for chart and average calculation
  useEffect(() => {
    const fetchRecentDismissals = async () => {
      if (!schoolId) return;
      
      try {
        // Fetch up to 10 for average calculation
        const { data: avgData, error: avgError } = await supabase
          .from('dismissal_runs')
          .select('id, date, status, started_at, ended_at, scheduled_start_time')
          .eq('school_id', schoolId)
          .not('ended_at', 'is', null)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(10);

        if (avgError) throw avgError;

        // Fetch last 5 for chart display
        const { data: chartData, error: chartError } = await supabase
          .from('dismissal_runs')
          .select('id, date, status, started_at, ended_at, scheduled_start_time')
          .eq('school_id', schoolId)
          .not('ended_at', 'is', null)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(5);

        if (chartError) throw chartError;

        // Process chart data (last 5 for display)
        const processedChartData = chartData?.map((dismissal, index) => {
          const startTime = dismissal.scheduled_start_time 
            ? new Date(dismissal.scheduled_start_time) 
            : new Date(dismissal.started_at);
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
          const startTime = dismissal.scheduled_start_time 
            ? new Date(dismissal.scheduled_start_time) 
            : new Date(dismissal.started_at);
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
          .select('date, started_at, ended_at, scheduled_start_time')
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
            const startTime = dismissal.scheduled_start_time 
              ? new Date(dismissal.scheduled_start_time) 
              : new Date(dismissal.started_at);
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

  // Check IC connection status
  useEffect(() => {
    const checkICConnection = async () => {
      if (!schoolId) {
        setCheckingICConnection(false);
        return;
      }
      
      try {
        const { data: connection } = await supabase
          .from('ic_connections' as any)
          .select('id')
          .eq('school_id', schoolId)
          .maybeSingle();
        
        setHasICConnection(!!connection);
      } catch (error) {
        console.error('Error checking IC connection:', error);
        setHasICConnection(false);
      } finally {
        setCheckingICConnection(false);
      }
    };

    checkICConnection();
  }, [schoolId]);

  // Check if setup method dialog should be shown
  useEffect(() => {
    if (!schoolId || setupLoading) return;
    
    // Check if setup is incomplete and user hasn't selected a method
    if (!isReady) {
      const setupMethodKey = `setup_method_selected_${schoolId}`;
      const selectedMethod = localStorage.getItem(setupMethodKey);
      
      // Only show if no method has been selected yet
      if (!selectedMethod) {
        setShowSetupMethodDialog(true);
      }
    }
  }, [schoolId, isReady, setupLoading]);

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

  // Compute dismissal timing state - use planTimeFallback if no run
  const planDismissalTime = run?.dismissal_time || planTimeFallback;
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

  const handleResetDismissalRun = async () => {
    setResetting(true);
    try {
      let runIdToReset = run?.id;
      
      // If no run exists, create one first
      if (!runIdToReset && schoolId) {
        const { data: newRunId, error: createError } = await supabase.rpc('create_scheduled_dismissal_run', {
          target_school_id: schoolId,
          target_date: new Date().toISOString().split('T')[0]
        });
        
        if (createError) {
          console.error("Error creating dismissal run:", createError);
          toast.error("Failed to create dismissal run");
          return;
        }
        
        runIdToReset = newRunId;
        toast.info("Created new dismissal run");
      }
      
      if (!runIdToReset) {
        toast.error("Unable to create or find dismissal run");
        return;
      }
      
      await resetDismissalRun(runIdToReset);
      toast.success("Testing Mode Enabled - Auto-timeout disabled");
      window.location.reload();
    } catch (error) {
      console.error("Error resetting dismissal run:", error);
      toast.error("Failed to reset dismissal run");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteTodayDismissal = async () => {
    setDeleting(true);
    try {
      await deleteTodayDismissal();
      toast.success("Successfully deleted all dismissal data for today");
      window.location.reload();
    } catch (error) {
      console.error("Error deleting today's dismissal:", error);
      toast.error("Failed to delete today's dismissal data");
    } finally {
      setDeleting(false);
    }
  };

  const handleExitTestingMode = async () => {
    if (!run?.id) return;
    
    try {
      const { error } = await supabase
        .from('dismissal_runs')
        .update({ testing_mode: false })
        .eq('id', run.id);

      if (error) throw error;

      toast.success("Testing Mode Disabled - Normal auto-timeout restored");
      window.location.reload();
    } catch (error) {
      console.error('Error exiting testing mode:', error);
      toast.error("Failed to exit testing mode");
    }
  };

  const handleSelectICSetup = () => {
    if (!schoolId) return;
    
    // Mark IC method as selected
    localStorage.setItem(`setup_method_selected_${schoolId}`, 'ic');
    setShowSetupMethodDialog(false);
    setShowICSetupDialog(true);
  };

  const handleSelectManualSetup = () => {
    if (!schoolId) return;
    
    // Mark manual method as selected
    localStorage.setItem(`setup_method_selected_${schoolId}`, 'manual');
    setShowSetupMethodDialog(false);
  };

  const handleICSetupComplete = () => {
    setShowICSetupDialog(false);
    // Refresh the page to reload setup status
    window.location.reload();
  };

  const handleICSetupClose = () => {
    setShowICSetupDialog(false);
    // User can come back to this later
  };

  // For school admins and teachers, show the sidebar layout
  if (userRole === 'school_admin' || userRole === 'teacher') {
    return (
      <>
        <SEO />
        <main className="flex-1 p-6 space-y-6">
          {run?.testing_mode && (
            <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">Testing Mode Active</AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <span>Auto-timeout is disabled. Run will not auto-complete.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitTestingMode}
                  className="ml-4"
                >
                  Exit Testing Mode
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <SchoolSetupMethodDialog
            open={showSetupMethodDialog}
            onSelectICSetup={handleSelectICSetup}
            onSelectManualSetup={handleSelectManualSetup}
          />

          {schoolId && (
            <ICSetupDialog
              open={showICSetupDialog}
              onClose={handleICSetupClose}
              schoolId={schoolId}
              onComplete={handleICSetupComplete}
            />
          )}

          {!setupLoading && !isReady && !showSetupMethodDialog && (
            userRole === 'school_admin' ? (
              <SetupChecklistCard statuses={statuses} />
            ) : (
              <TeacherSetupGuide />
            )
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
          
          {/* Teacher Coverage Management Quick Access */}
          {userRole === 'teacher' && (
            <Card className="shadow-elevated border-0 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Class Coverage Management</CardTitle>
                </div>
                <CardDescription>
                  Assign other teachers to cover your classes when you're absent
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button asChild variant="default">
                  <Link to="/dashboard/coverage">
                    Assign Coverage
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard/coverage">
                    View Schedule
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          <div className="relative">
            {!setupLoading && !isReady && (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these insights.</p>
              </div>
            )}
            <div aria-hidden={!setupLoading && !isReady ? true : undefined} className={`grid gap-6 ${userRole === 'teacher' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Dismissal Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {run?.status === 'completed' ? (
                    <>
                      <div className="text-lg font-semibold text-green-600">Dismissal completed today</div>
                      {run.ended_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ended at {new Date(run.ended_at).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      )}
                    </>
                  ) : planDismissalTime ? (
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
                      {userRole === 'school_admin' && (
                        <Button asChild variant="outline" size="sm">
                          <Link to="/dashboard/dismissal-plans">
                            Manage Dismissal Plans
                          </Link>
                        </Button>
                      )}
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

          {userRole === 'school_admin' && (
            <div className="relative">
              {!setupLoading && !isReady && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Complete the setup checklist to unlock these actions and activity.</p>
                </div>
              )}
              <div aria-hidden={!setupLoading && !isReady ? true : undefined} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    <Button asChild className="w-full justify-start" variant="outline">
                      <Link to="/dashboard/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Roster
                      </Link>
                    </Button>
                    <Button asChild className="w-full justify-start" variant="outline">
                      <Link to="/dashboard/coverage">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Manage Coverage
                      </Link>
                    </Button>
                    <Button asChild className="w-full justify-start" variant="outline">
                      <Link to="/dashboard/absences">
                        <UserX className="mr-2 h-4 w-4" />
                        Mark Absences
                      </Link>
                    </Button>
                    <Button
                      onClick={handleResetDismissalRun}
                      className="w-full justify-start" 
                      variant="outline"
                      disabled={resetting}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {resetting ? "Resetting..." : "Reset Today's Dismissal (Testing)"}
                    </Button>
                    <Button 
                      onClick={handleDeleteTodayDismissal}
                      className="w-full justify-start" 
                      variant="destructive"
                      disabled={deleting}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {deleting ? "Deleting..." : "Delete Today's Dismissal"}
                    </Button>
                  </CardContent>
                </Card>

                {/* IC Integration Card - Shows setup widget if not connected, summary if connected */}
                {!checkingICConnection && (
                  hasICConnection ? (
                    <ICDashboardSummary schoolId={schoolId} />
                  ) : (
                    <ICSyncStatusWidget schoolId={schoolId} />
                  )
                )}
              </div>
            </div>
          )}

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

        {run?.testing_mode && (
          <Alert className="mb-8 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Testing Mode Active</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <span>Auto-timeout is disabled. Run will not auto-complete.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitTestingMode}
                className="ml-4"
              >
                Exit Testing Mode
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
          <div aria-hidden={!setupLoading && !isReady ? true : undefined} className={`grid gap-6 ${userRole === 'teacher' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
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
                    {userRole === 'school_admin' && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/dashboard/dismissal-plans">
                          Manage Dismissal Plans
                        </Link>
                      </Button>
                    )}
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

        {userRole !== 'teacher' && (
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
                    Common tasks for users
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/dashboard/import">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Roster
                    </Link>
                  </Button>
                  <Button 
                    onClick={handleResetDismissalRun}
                    className="w-full justify-start" 
                    variant="outline"
                    disabled={resetting}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {resetting ? "Resetting..." : "Reset Today's Dismissal (Testing)"}
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
        )}
      </div>
      </div>
    </>
  );
};

export default Dashboard;