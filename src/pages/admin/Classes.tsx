import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, User, Clock, CalendarDays, ChevronLeft, ChevronRight, Search, MoreHorizontal, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ManageClassStudentsDialog } from "@/components/ManageClassStudentsDialog";

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
  has_teachers: boolean;
  has_students: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Classes = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("assigned");
  const [managingClass, setManagingClass] = useState<ClassData | null>(null);

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

          const { data: sessions } = await supabase
            .from('academic_sessions')
            .select('id, session_name, is_active')
            .eq('school_id', profile.school_id)
            .order('is_active', { ascending: false })
            .order('start_date', { ascending: false });

          if (sessions) {
            setAcademicSessions(sessions);
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

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedSessionId, pageSize, searchQuery, assignmentFilter]);

  // Fetch aggregate stats separately
  const { data: stats } = useQuery({
    queryKey: ['classes-stats', schoolId, selectedSessionId],
    queryFn: async () => {
      if (!schoolId || !selectedSessionId) return { total: 0, withPeriods: 0, withoutPeriods: 0, totalStudents: 0 };

      const [totalRes, withPeriodsRes, withoutPeriodsRes, studentsRes] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('academic_session_id', selectedSessionId),
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('academic_session_id', selectedSessionId)
          .not('period_number', 'is', null),
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('academic_session_id', selectedSessionId)
          .is('period_number', null),
        supabase.from('class_rosters').select('id', { count: 'exact', head: true })
          .eq('academic_session_id', selectedSessionId),
      ]);

      return {
        total: totalRes.count || 0,
        withPeriods: withPeriodsRes.count || 0,
        withoutPeriods: withoutPeriodsRes.count || 0,
        totalStudents: studentsRes.count || 0,
      };
    },
    enabled: !!schoolId && !!selectedSessionId,
  });

  // Fetch paginated classes via server-side RPC
  const { data: classesResult, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', schoolId, selectedSessionId, page, pageSize, searchQuery, assignmentFilter],
    queryFn: async () => {
      if (!schoolId || !selectedSessionId) return { classes: [] as ClassData[], count: 0 };

      const { data, error } = await supabase.rpc('get_classes_paginated', {
        p_school_id: schoolId,
        p_session_id: selectedSessionId,
        p_search_query: searchQuery.trim(),
        p_filter: assignmentFilter,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (error) throw error;

      const totalCount = data?.[0]?.total_count ?? 0;

      const classes = (data || []).map((row: any) => ({
        id: row.class_id,
        class_name: row.class_name,
        room_number: row.room_number,
        grade_level: row.grade_level,
        period_number: row.period_number,
        period_name: row.period_name,
        period_start_time: row.period_start_time,
        period_end_time: row.period_end_time,
        student_count: Number(row.student_count) || 0,
        teacher_names: row.teacher_names ? row.teacher_names.split(', ') : [],
        has_teachers: row.has_teachers || false,
        has_students: row.has_students || false,
      })) as ClassData[];

      return { classes, count: Number(totalCount) };
    },
    enabled: !!schoolId && !!selectedSessionId,
  });

  const classes = classesResult?.classes || [];
  const totalCount = classesResult?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleHideClass = async (classId: string, className: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_hidden: true })
        .eq('id', classId);
      if (error) throw error;
      toast.success(`"${className}" has been hidden`);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes-stats'] });
    } catch (error) {
      console.error('Error hiding class:', error);
      toast.error('Failed to hide class');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Search + Actions Row */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
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
            <div className="text-2xl font-bold text-green-600">{stats?.withPeriods || 0}</div>
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
            <div className="text-2xl font-bold text-orange-600">{stats?.withoutPeriods || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Class Management
            </CardTitle>
            {selectedSessionId && academicSessions.length > 0 && (
              <Badge variant="secondary">
                {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-2">View and manage classes for the selected academic session</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="mb-6 flex flex-wrap items-end gap-4">
            {academicSessions.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="session-filter" className="text-sm font-medium">Academic Session</Label>
                <Select value={selectedSessionId || ''} onValueChange={setSelectedSessionId}>
                  <SelectTrigger id="session-filter" className="w-[240px]">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.session_name} {session.is_active && '(Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="assignment-filter" className="text-sm font-medium">Status</Label>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger id="assignment-filter" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="with_students">With Students</SelectItem>
                  <SelectItem value="with_teachers">With Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page-size" className="text-sm font-medium">Show</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger id="page-size" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {classesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No classes match your search' : 'No classes found for the selected session'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="hidden md:table-cell">Time</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.class_name}</TableCell>
                      <TableCell>{cls.room_number || '—'}</TableCell>
                      <TableCell>
                        {cls.period_number !== null ? (
                          <Badge variant="outline">
                            {cls.period_name || `Period ${cls.period_number}`}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No period</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
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
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setManagingClass(cls)}>{cls.student_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleHideClass(cls.id, cls.class_name)}>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Hide Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount} classes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {managingClass && schoolId && (
        <ManageClassStudentsDialog
          open={!!managingClass}
          onOpenChange={(o) => !o && setManagingClass(null)}
          classId={managingClass.id}
          className={managingClass.class_name}
          gradeLevel={managingClass.grade_level}
          schoolId={schoolId}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['classes-stats'] });
          }}
        />
      )}
    </div>
  );
};

export default Classes;
