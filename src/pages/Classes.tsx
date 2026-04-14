import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Users, GraduationCap, BookOpen, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Edit, UserPlus, Repeat, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ManageClassStudentsDialog } from "@/components/ManageClassStudentsDialog";
import { AssignClassCoverageDialog } from "@/components/AssignClassCoverageDialog";

interface AddTeacherDialogProps {
  schoolId: number;
  onTeacherAdded: (teacher: Teacher) => void;
}

const AddTeacherDialog = ({ schoolId, onTeacherAdded }: AddTeacherDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('invite-teacher-unified', {
        body: { email: formData.email, firstName: formData.firstName, lastName: formData.lastName, schoolId }
      });
      if (response.error) throw response.error;
      const result = response.data;
      if (result.success > 0) {
        toast.success(`Teacher invitation sent to ${formData.email}`);
        const newTeacher: Teacher = {
          id: result.invitations[0]?.teacherId || crypto.randomUUID(),
          first_name: formData.firstName, last_name: formData.lastName, email: formData.email,
          school_id: schoolId, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        onTeacherAdded(newTeacher);
        resetForm();
        setOpen(false);
      } else {
        throw new Error(result.errors?.[0] || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error inviting teacher:', error);
      toast.error(error.message || "Failed to send teacher invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>Create a new teacher account for your school.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Teacher'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const editClassSchema = z.object({
  class_name: z.string().min(1, "Class name is required"),
  grade_level: z.string().min(1, "Grade level is required"),
  room_number: z.string().optional(),
  teacher_id: z.string().min(1, "Teacher is required"),
});

interface ClassRecord {
  id: string;
  class_name: string;
  grade_level: string;
  room_number: string | null;
  teacher_name: string | null;
  student_count: number;
  created_at: string;
  updated_at: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: number;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Classes = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const isMobile = useIsMobile();
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);

  useEffect(() => {
    const tabletMql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    const mobileMql = window.matchMedia("(max-width: 767px)");
    const updateTabletState = () => setIsTabletOrMobile(mobileMql.matches || tabletMql.matches);
    updateTabletState();
    tabletMql.addEventListener("change", updateTabletState);
    mobileMql.addEventListener("change", updateTabletState);
    return () => {
      tabletMql.removeEventListener("change", updateTabletState);
      mobileMql.removeEventListener("change", updateTabletState);
    };
  }, []);

  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [assignmentFilter, setAssignmentFilter] = useState<string>('assigned');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClassRecord | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherSearchResults, setTeacherSearchResults] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [managingClass, setManagingClass] = useState<ClassRecord | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  // Academic session state
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Fetch academic sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!schoolId) return;
      const { data: sessions } = await supabase
        .from('academic_sessions')
        .select('id, session_name, is_active')
        .eq('school_id', schoolId)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });
      if (sessions) {
        setAcademicSessions(sessions);
        const active = sessions.find(s => s.is_active);
        if (active) setSelectedSessionId(active.id);
      }
    };
    fetchSessions();
  }, [schoolId]);

  // Reset page on filter changes
  useEffect(() => { setPage(0); }, [searchTerm, pageSize, selectedSessionId, assignmentFilter]);

  // Fetch stats using the RPC with 'all' filter and limit 1 just for total_count
  const { data: stats } = useQuery({
    queryKey: ['classes-stats', schoolId, selectedSessionId],
    queryFn: async () => {
      if (!schoolId || !selectedSessionId) return { total: 0, totalStudents: 0, totalTeachers: 0 };

      const [totalRes, studentsRes] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('academic_session_id', selectedSessionId),
        supabase.from('class_rosters').select('id', { count: 'exact', head: true })
          .eq('academic_session_id', selectedSessionId),
      ]);

      // Unique teacher count via paginated fetch
      const teacherIds = new Set<string>();
      let offset = 0;
      const chunkSize = 900;
      while (true) {
        const { data } = await supabase
          .from('class_teachers')
          .select('teacher_id, classes!inner(school_id, academic_session_id)')
          .eq('classes.school_id', schoolId)
          .eq('classes.academic_session_id', selectedSessionId)
          .range(offset, offset + chunkSize - 1);
        if (!data || data.length === 0) break;
        data.forEach((t: any) => teacherIds.add(t.teacher_id));
        if (data.length < chunkSize) break;
        offset += chunkSize;
      }

      return {
        total: totalRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalTeachers: teacherIds.size,
      };
    },
    enabled: !!schoolId && !!selectedSessionId,
  });

  const avgClassSize = stats && stats.total > 0 ? (stats.totalStudents / stats.total).toFixed(1) : '0.0';

  // Fetch paginated classes via server-side RPC
  const { data: classesResult, isLoading: classesLoading, refetch: refetchClasses } = useQuery({
    queryKey: ['classes-paginated', schoolId, selectedSessionId, page, pageSize, searchTerm, assignmentFilter],
    queryFn: async () => {
      if (!schoolId || !selectedSessionId) return { classes: [] as ClassRecord[], count: 0 };

      const { data, error } = await supabase.rpc('get_classes_paginated', {
        p_school_id: schoolId,
        p_session_id: selectedSessionId,
        p_search_query: searchTerm.trim(),
        p_filter: assignmentFilter,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (error) throw error;

      const totalCount = data?.[0]?.total_count ?? 0;

      const classes = (data || []).map((row: any) => ({
        id: row.class_id,
        class_name: row.class_name,
        grade_level: row.grade_level || '',
        room_number: row.room_number,
        teacher_name: row.teacher_names || null,
        student_count: Number(row.student_count) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })) as ClassRecord[];

      return { classes, count: Number(totalCount) };
    },
    enabled: !!schoolId && !!selectedSessionId,
  });

  const currentClasses = classesResult?.classes || [];
  const totalCount = classesResult?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) return;
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles!inner(id, first_name, last_name, email, school_id, created_at, updated_at)')
        .eq('role', 'teacher')
        .eq('profiles.school_id', schoolId);
      if (!error) {
        const teachers = userRoles?.map(ur => ur.profiles).filter(Boolean) || [];
        setAvailableTeachers(teachers);
      }
    };
    fetchTeachers();
  }, [schoolId]);

  const refreshData = () => { refetchClasses(); };

  const searchTeachers = (term: string) => {
    if (!term.trim()) { setTeacherSearchResults([]); return; }
    setTeacherSearchResults(availableTeachers.filter(t =>
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(term.toLowerCase())
    ));
  };

  const form = useForm<z.infer<typeof editClassSchema>>({
    resolver: zodResolver(editClassSchema),
    defaultValues: { class_name: "", grade_level: "", room_number: "", teacher_id: "" },
  });

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setTeacherSearchTerm(`${teacher.first_name} ${teacher.last_name}`);
    setTeacherSearchResults([]);
    form.setValue('teacher_id', teacher.id);
  };

  const clearTeacherSelection = () => {
    setSelectedTeacher(null);
    setTeacherSearchTerm('');
    setTeacherSearchResults([]);
    form.setValue('teacher_id', '');
  };

  const handleTeacherAdded = (teacher: Teacher) => {
    setAvailableTeachers(prev => [...prev, teacher]);
    handleTeacherSelect(teacher);
  };

  useEffect(() => {
    if (editingRecord) {
      form.reset({ class_name: editingRecord.class_name, grade_level: editingRecord.grade_level, room_number: editingRecord.room_number || "", teacher_id: "" });
      fetchCurrentTeacher(editingRecord.id);
    } else if (showAddDialog) {
      form.reset({ class_name: "", grade_level: "", room_number: "", teacher_id: "" });
      clearTeacherSelection();
    }
  }, [editingRecord, showAddDialog]);

  const fetchCurrentTeacher = async (classId: string) => {
    const { data } = await supabase.from('class_teachers').select('teachers(id, first_name, last_name)').eq('class_id', classId).limit(1);
    if (data?.[0]?.teachers) {
      const teacher = data[0].teachers as Teacher;
      setSelectedTeacher(teacher);
      setTeacherSearchTerm(`${teacher.first_name} ${teacher.last_name}`);
      form.setValue('teacher_id', teacher.id);
    } else {
      clearTeacherSelection();
    }
  };

  const handleEditClass = async (values: z.infer<typeof editClassSchema>) => {
    if (!editingRecord) return;
    try {
      const { error: classError } = await supabase.from('classes').update({ class_name: values.class_name, grade_level: values.grade_level, room_number: values.room_number || null }).eq('id', editingRecord.id);
      if (classError) { toast.error('Failed to update class'); return; }
      await supabase.from('class_teachers').delete().eq('class_id', editingRecord.id);
      if (values.teacher_id) {
        const { error: teacherError } = await supabase.from('class_teachers').insert({ class_id: editingRecord.id, teacher_id: values.teacher_id });
        if (teacherError) { toast.error('Class updated but failed to assign teacher'); return; }
      }
      toast.success('Class updated successfully');
      setEditingRecord(null);
      clearTeacherSelection();
      form.reset();
      refreshData();
    } catch (error) {
      toast.error('Failed to update class');
    }
  };

  const handleAddClass = async (values: z.infer<typeof editClassSchema>) => {
    if (!schoolId) { toast.error('Unable to determine school'); return; }
    try {
      const insertData: any = { class_name: values.class_name, grade_level: values.grade_level, room_number: values.room_number || null, school_id: schoolId };
      if (selectedSessionId) insertData.academic_session_id = selectedSessionId;
      const { data: classData, error: classError } = await supabase.from('classes').insert(insertData).select().single();
      if (classError) { toast.error('Failed to create class'); return; }
      if (values.teacher_id && classData) {
        await supabase.from('class_teachers').insert({ class_id: classData.id, teacher_id: values.teacher_id });
      }
      toast.success('Class created successfully');
      setShowAddDialog(false);
      clearTeacherSelection();
      form.reset();
      refreshData();
    } catch (error) {
      toast.error('Failed to create class');
    }
  };

  const handleFormSubmit = (values: z.infer<typeof editClassSchema>) => {
    if (editingRecord) handleEditClass(values);
    else handleAddClass(values);
  };

  const queryClient = useQueryClient();

  const handleHideClass = async (classId: string, className: string) => {
    // Optimistically remove from UI
    const queryKey = ['classes-paginated', schoolId, selectedSessionId, debouncedSearch, assignmentFilter, currentPage, pageSize];
    const previousData = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return old.filter((c: any) => c.class_id !== classId);
    });

    const { error } = await supabase
      .from('classes')
      .update({ is_hidden: true })
      .eq('id', classId);

    if (error) {
      queryClient.setQueryData(queryKey, previousData);
      toast.error("Failed to hide class");
    } else {
      toast.success(`"${className}" has been hidden. Use the "Hidden" filter to find it.`);
      queryClient.invalidateQueries({ queryKey: ['classes-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['classes-stats'] });
    }
  };

  const handleUnhideClass = async (classId: string, className: string) => {
    const queryKey = ['classes-paginated', schoolId, selectedSessionId, debouncedSearch, assignmentFilter, currentPage, pageSize];
    const previousData = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return old.filter((c: any) => c.class_id !== classId);
    });

    const { error } = await supabase
      .from('classes')
      .update({ is_hidden: false })
      .eq('id', classId);

    if (error) {
      queryClient.setQueryData(queryKey, previousData);
      toast.error("Failed to unhide class");
    } else {
      toast.success(`"${className}" is now visible again`);
      queryClient.invalidateQueries({ queryKey: ['classes-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['classes-stats'] });
    }
  };

  if (loading || isLoadingSchoolId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'school_admin') return null;

  const StatsCards = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
          <p className="text-xs text-muted-foreground">Active classes this session</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
          <p className="text-xs text-muted-foreground">Students enrolled</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
          <p className="text-xs text-muted-foreground">Teachers assigned</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgClassSize}</div>
          <p className="text-xs text-muted-foreground">Students per class</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Summary Cards */}
            {isMobile ? (
              <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full px-4 py-3 bg-card border rounded-lg hover:bg-accent transition-colors">
                    <span className="font-semibold text-lg">Stats</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-4 border rounded-lg bg-muted/30">
                  <div className="grid gap-4 grid-cols-1">
                    <StatsCards />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCards />
              </div>
            )}

            {/* Classes Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg md:text-xl">Classes Management</CardTitle>
                      {selectedSessionId && academicSessions.length > 0 && (
                        <Badge variant="secondary">
                          {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs md:text-sm mt-1">
                      Manage school classes, teachers, and student assignments
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => navigate("/dashboard/people/classes/convert-groups")} className="w-full md:w-auto">
                      <Repeat className="h-4 w-4 mr-2" />
                      Convert Groups/Teams
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)} className="w-full md:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Class
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search, Filters, and Page Size */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search classes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="with_students">With Students</SelectItem>
                        <SelectItem value="with_teachers">With Teachers</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                    {academicSessions.length > 1 && (
                      <Select value={selectedSessionId || ''} onValueChange={setSelectedSessionId}>
                        <SelectTrigger className="w-[200px]">
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
                    )}
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Classes Table/Cards */}
                  {classesLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : isTabletOrMobile ? (
                    <div className="space-y-3">
                      {currentClasses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {searchTerm ? 'No classes match your search.' : 'No classes found for this session.'}
                        </div>
                      ) : (
                        currentClasses.map((classRecord) => (
                          <Card key={classRecord.id} className="border">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{classRecord.class_name}</CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {classRecord.teacher_name || 'No teacher assigned'}
                                  </CardDescription>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                    <DropdownMenuItem onClick={() => setEditingRecord(classRecord)}>
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setManagingClass(classRecord)}>
                                      <Users className="h-4 w-4 mr-2" /> Manage Students
                                    </DropdownMenuItem>
                                    <AssignClassCoverageDialog
                                      classId={classRecord.id}
                                      className={classRecord.class_name}
                                      availableTeachers={availableTeachers.map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name, email: t.email }))}
                                      onCoverageAssigned={refreshData}
                                    />
                                    {assignmentFilter === 'hidden' ? (
                                      <DropdownMenuItem onClick={() => handleUnhideClass(classRecord.id, classRecord.class_name)}>
                                        <Eye className="h-4 w-4 mr-2" /> Unhide Class
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleHideClass(classRecord.id, classRecord.class_name)}>
                                        <EyeOff className="h-4 w-4 mr-2" /> Hide Class
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{classRecord.student_count} students</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border bg-background/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-muted/50">
                            <TableHead>Class Name</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead className="w-[50px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentClasses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                {searchTerm ? 'No classes match your search.' : 'No classes found for this session.'}
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentClasses.map((classRecord) => (
                              <TableRow key={classRecord.id} className="border-border hover:bg-muted/30">
                                <TableCell className="font-medium">{classRecord.class_name}</TableCell>
                                <TableCell>{classRecord.teacher_name || 'No teacher assigned'}</TableCell>
                                <TableCell><Badge variant="secondary">{classRecord.student_count}</Badge></TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                      <DropdownMenuItem onClick={() => setEditingRecord(classRecord)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setManagingClass(classRecord)}>
                                        <Users className="h-4 w-4 mr-2" /> Manage Students
                                      </DropdownMenuItem>
                                      <AssignClassCoverageDialog
                                        classId={classRecord.id}
                                        className={classRecord.class_name}
                                        availableTeachers={availableTeachers.map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name, email: t.email }))}
                                        onCoverageAssigned={refreshData}
                                      />
                                      {assignmentFilter === 'hidden' ? (
                                        <DropdownMenuItem onClick={() => handleUnhideClass(classRecord.id, classRecord.class_name)}>
                                          <Eye className="h-4 w-4 mr-2" /> Unhide Class
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => handleHideClass(classRecord.id, classRecord.class_name)}>
                                          <EyeOff className="h-4 w-4 mr-2" /> Hide Class
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalCount > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t">
                      <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
                        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount} classes
                      </p>
                      <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p - 1)}
                          disabled={page === 0}
                          className="flex-1 md:flex-none"
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
                          className="flex-1 md:flex-none"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Add/Edit Class Dialog */}
        <Dialog open={showAddDialog || !!editingRecord} onOpenChange={() => { setShowAddDialog(false); setEditingRecord(null); clearTeacherSelection(); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Class Information' : 'Add New Class'}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "Update the class details below." : "Enter the new class details below."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="class_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl><Input placeholder="Enter class name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="grade_level" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="6">6th Grade</SelectItem>
                        <SelectItem value="7">7th Grade</SelectItem>
                        <SelectItem value="8">8th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="room_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl><Input placeholder="Enter room number (optional)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {/* Teacher Search */}
                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher *</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input id="teacher" placeholder="Search for a teacher..." value={teacherSearchTerm}
                          onChange={(e) => { setTeacherSearchTerm(e.target.value); searchTeachers(e.target.value); }} />
                        {selectedTeacher && (
                          <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-8 w-8 p-0" onClick={clearTeacherSelection}>×</Button>
                        )}
                      </div>
                      {schoolId && <AddTeacherDialog schoolId={schoolId} onTeacherAdded={handleTeacherAdded} />}
                    </div>
                    {teacherSearchResults.length > 0 && (
                      <div className="border rounded-md bg-background max-h-32 overflow-y-auto">
                        {teacherSearchResults.map((teacher) => (
                          <div key={teacher.id} className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0" onClick={() => handleTeacherSelect(teacher)}>
                            <div className="text-sm font-medium">{teacher.first_name} {teacher.last_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTeacher && (
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-sm font-medium">Selected: {selectedTeacher.first_name} {selectedTeacher.last_name}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setEditingRecord(null); clearTeacherSelection(); }}>Cancel</Button>
                  <Button type="submit">{editingRecord ? 'Save Changes' : 'Add Class'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {managingClass && schoolId && (
          <ManageClassStudentsDialog
            open={!!managingClass}
            onOpenChange={(o) => !o && setManagingClass(null)}
            classId={managingClass.id}
            className={managingClass.class_name}
            gradeLevel={managingClass.grade_level}
            schoolId={schoolId}
            onUpdated={refreshData}
          />
        )}
      </div>
    </>
  );
};

export default Classes;
