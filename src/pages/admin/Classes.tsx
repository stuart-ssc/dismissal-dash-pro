import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, User, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClassData {
  id: string;
  class_name: string;
  room_number?: string;
  grade_level?: string;
  period_number?: number;
  period_name?: string;
  period_start_time?: string;
  period_end_time?: string;
  student_count: number;
  teacher_names: string[];
}

const Classes = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (profile?.school_id) {
          setSchoolId(profile.school_id);

          // Fetch academic sessions
          const { data: sessions } = await supabase
            .from('academic_sessions')
            .select('id, session_name, is_active')
            .eq('school_id', profile.school_id)
            .order('is_active', { ascending: false })
            .order('start_date', { ascending: false });

          if (sessions) {
            setAcademicSessions(sessions);
            // Pre-select active session
            const activeSession = sessions.find(s => s.is_active);
            if (activeSession) {
              setSelectedSessionId(activeSession.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school data:', error);
      }
    };

    fetchSchoolData();
  }, [user]);

  // Fetch classes for selected session
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', schoolId, selectedSessionId],
    queryFn: async () => {
      if (!schoolId || !selectedSessionId) return [];

      // Fetch classes with their rosters and teachers
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          class_name,
          room_number,
          grade_level,
          period_number,
          period_name,
          period_start_time,
          period_end_time
        `)
        .eq('school_id', schoolId)
        .eq('academic_session_id', selectedSessionId)
        .order('period_number', { ascending: true, nullsFirst: false })
        .order('class_name', { ascending: true });

      if (error) throw error;

      // Fetch student counts and teacher names for each class
      const classIds = classesData?.map(c => c.id) || [];
      
      const [rosterCounts, teacherData] = await Promise.all([
        supabase
          .from('class_rosters')
          .select('class_id')
          .in('class_id', classIds),
        supabase
          .from('class_teachers')
          .select('class_id, teachers(first_name, last_name)')
          .in('class_id', classIds)
      ]);

      // Build lookup maps
      const studentCountMap = new Map<string, number>();
      rosterCounts.data?.forEach(r => {
        studentCountMap.set(r.class_id, (studentCountMap.get(r.class_id) || 0) + 1);
      });

      const teacherMap = new Map<string, string[]>();
      teacherData.data?.forEach((t: any) => {
        if (!teacherMap.has(t.class_id)) {
          teacherMap.set(t.class_id, []);
        }
        if (t.teachers) {
          teacherMap.get(t.class_id)!.push(`${t.teachers.first_name} ${t.teachers.last_name}`);
        }
      });

      return classesData?.map(cls => ({
        ...cls,
        student_count: studentCountMap.get(cls.id) || 0,
        teacher_names: teacherMap.get(cls.id) || []
      })) as ClassData[] || [];
    },
    enabled: !!schoolId && !!selectedSessionId,
  });

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

  const classesWithPeriods = classes?.filter(c => c.period_number !== null).length || 0;
  const classesWithoutPeriods = classes?.filter(c => c.period_number === null).length || 0;

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage school classes and student assignments</p>
          {selectedSessionId && academicSessions.length > 0 && (
            <Badge variant="secondary" className="mt-2">
              Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
            </Badge>
          )}
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes?.reduce((sum, c) => sum + c.student_count, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-green-50/80 dark:bg-green-950/20 backdrop-blur border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              With Period Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{classesWithPeriods}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-orange-50/80 dark:bg-orange-950/20 backdrop-blur border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              Missing Period Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{classesWithoutPeriods}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Class Management
          </CardTitle>
          <CardDescription>View and manage classes for the selected academic session</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Academic Session Selector */}
          {academicSessions.length > 0 && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border space-y-2">
              <Label htmlFor="session-filter" className="text-sm font-medium">
                Academic Year / Session
              </Label>
              <Select value={selectedSessionId || ''} onValueChange={(value) => setSelectedSessionId(value)}>
                <SelectTrigger id="session-filter" className="w-full max-w-md">
                  <SelectValue placeholder="Select academic session" />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.session_name} {session.is_active && '(Active)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Showing classes for selected academic session
              </p>
            </div>
          )}

          {classesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !classes || classes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No classes found for the selected session
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.class_name}</TableCell>
                    <TableCell>{cls.room_number || '—'}</TableCell>
                    <TableCell>{cls.grade_level || '—'}</TableCell>
                    <TableCell>
                      {cls.period_number !== null ? (
                        <Badge variant="outline">
                          {cls.period_name || `Period ${cls.period_number}`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No period</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cls.period_start_time && cls.period_end_time ? (
                        <span className="text-sm text-muted-foreground">
                          {cls.period_start_time} - {cls.period_end_time}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cls.teacher_names.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {cls.teacher_names.map((name, idx) => (
                            <span key={idx} className="text-sm">{name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No teachers</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cls.student_count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Classes;