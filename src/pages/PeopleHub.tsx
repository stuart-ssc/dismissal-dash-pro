import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Users, GraduationCap, CalendarDays, UserX, UsersRound } from "lucide-react";

export default function PeopleHub() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalClasses: 0,
    activeGroups: 0,
    absencesToday: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      
      const sid = profile?.school_id ?? null;
      setSchoolId(sid);
      
      if (!sid) return;

      const today = new Date().toISOString().split('T')[0];
      
      // @ts-ignore - Avoid deep type instantiation
      const peopleRes = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', sid);
      
      // @ts-ignore - Avoid deep type instantiation
      const classesRes = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', sid);
      
      // @ts-ignore - Avoid deep type instantiation
      const groupsRes = await supabase
        .from('special_use_groups')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', sid)
        .eq('is_active', true);
      
      // @ts-ignore - Avoid deep type instantiation
      const absencesRes = await supabase
        .from('student_absences')
        .select('*', { count: 'exact', head: true })
        .eq('absence_date', today);

      setStats({
        totalPeople: peopleRes.count ?? 0,
        totalClasses: classesRes.count ?? 0,
        activeGroups: groupsRes.count ?? 0,
        absencesToday: absencesRes.count ?? 0,
      });
    };
    fetchData();
  }, [user]);

  const navigationCards = [
    {
      title: "Classes",
      description: "Manage classes, teachers, and student assignments",
      icon: GraduationCap,
      href: "/dashboard/people/classes",
      stat: stats.totalClasses,
      statLabel: "Total Classes",
    },
    {
      title: "Coverage",
      description: "Assign and manage teacher coverage for absences",
      icon: CalendarDays,
      href: "/dashboard/people/coverage",
      stat: null,
      statLabel: null,
    },
    {
      title: "Absences",
      description: "Track and manage student absences",
      icon: UserX,
      href: "/dashboard/people/absences",
      stat: stats.absencesToday,
      statLabel: "Absent Today",
    },
    {
      title: "Manage People",
      description: "View and manage all students and staff",
      icon: Users,
      href: "/dashboard/people/manage",
      stat: stats.totalPeople,
      statLabel: "Total People",
    },
    {
      title: "Groups & Teams",
      description: "Manage special groups for field trips, athletics, clubs, and more",
      icon: UsersRound,
      href: "/dashboard/people/groups-teams",
      stat: stats.activeGroups,
      statLabel: "Active Groups",
    },
  ];

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">People</h1>
            <p className="text-sm text-muted-foreground">
              Manage students, staff, classes, and groups
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total People</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPeople}</div>
              <p className="text-xs text-muted-foreground">Students and staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">Active classes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGroups}</div>
              <p className="text-xs text-muted-foreground">Groups & teams</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absences Today</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.absencesToday}</div>
              <p className="text-xs text-muted-foreground">Students absent</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => (
            <Link key={card.href} to={card.href}>
              <Card className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                {card.stat !== null && (
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{card.stat}</span>
                      <span className="text-sm text-muted-foreground">{card.statLabel}</span>
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
