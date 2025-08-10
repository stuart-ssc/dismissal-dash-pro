import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Calendar, BarChart3, Upload } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
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
  const showDismissalControls = !!planStartDate && prep !== null && now >= new Date(planStartDate.getTime() - (prep as number) * 60000);
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
          {showDismissalControls && (
            <section aria-label="Dismissal controls" className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Dismissal plan updated</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New parent registered</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Weekly report generated</p>
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dismissal plan updated</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New parent registered</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Weekly report generated</p>
                    <p className="text-xs text-muted-foreground">3 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;