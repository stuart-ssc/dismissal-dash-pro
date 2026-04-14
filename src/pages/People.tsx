import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, GraduationCap, UserCheck, User, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, MoreHorizontal, Edit, Mail, Copy, Clock, CheckCircle2, AlertCircle, Calendar as CalendarIcon, Loader2, Archive, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePaginatedPeople, type PersonData } from "@/hooks/usePaginatedPeople";
import { useQueryClient } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { EditPersonDialog } from "@/components/EditPersonDialog";
import { AssignClassCoverageDialog } from "@/components/AssignClassCoverageDialog";
import { TemporaryTransportationDialog } from "@/components/TemporaryTransportationDialog";
import { ViewTemporaryTransportationDialog } from "@/components/ViewTemporaryTransportationDialog";
import { TemporaryTransportationBadge } from "@/components/TemporaryTransportationBadge";
import { TeachersWithoutClassesAlert } from "@/components/TeachersWithoutClassesAlert";
import { ManagePersonClassesDialog } from "@/components/ManagePersonClassesDialog";

const People = () => {
  const { user, userRole, signOut, loading, session } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<PersonData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<PersonData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'grade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterRole, setFilterRole] = useState<'all' | 'school_admin' | 'teacher' | 'student'>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [tempTransportDialogOpen, setTempTransportDialogOpen] = useState(false);
  const [viewTempTransportDialogOpen, setViewTempTransportDialogOpen] = useState(false);
  const [studentForTempTransport, setStudentForTempTransport] = useState<any>(null);
  const [tempTransportData, setTempTransportData] = useState<Record<string, any>>({});
  const [anyOverrideData, setAnyOverrideData] = useState<Record<string, boolean>>({});
  const [isBulkInviting, setIsBulkInviting] = useState(false);
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [manageClassesOpen, setManageClassesOpen] = useState(false);
  const [personForClasses, setPersonForClasses] = useState<PersonData | null>(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    pendingInvites: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    const tabletMql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    const mobileMql = window.matchMedia("(max-width: 767px)");
    
    const updateTabletState = () => {
      setIsTabletOrMobile(mobileMql.matches || tabletMql.matches);
    };
    
    updateTabletState();
    
    const onChange = () => updateTabletState();
    tabletMql.addEventListener("change", onChange);
    mobileMql.addEventListener("change", onChange);
    
    return () => {
      tabletMql.removeEventListener("change", onChange);
      mobileMql.removeEventListener("change", onChange);
    };
  }, []);

  // Use the paginated people hook
  const { data: paginatedData, isLoading: isPeopleLoading, error: peopleError } = usePaginatedPeople({
    schoolId,
    page: currentPage,
    pageSize: itemsPerPage,
    roleFilter: filterRole,
    gradeFilter: filterGrade,
    searchQuery,
    sortBy,
    sortOrder,
    sessionId: selectedSessionId,
    enabled: !!schoolId,
  });

  const people = paginatedData?.people || [];
  const totalCount = paginatedData?.totalCount || 0;
  const isLoading = loading || isPeopleLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate, session]);

  useEffect(() => {
    const fetchAcademicSessions = async () => {
      if (!schoolId) return;
      
      try {
        // Fetch academic sessions
        const { data: sessions } = await supabase
          .from('academic_sessions')
          .select('id, session_name, is_active')
          .eq('school_id', schoolId)
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
      } catch (error) {
        console.error('Error fetching academic sessions:', error);
      }
    };

    fetchAcademicSessions();
  }, [schoolId]);

  // Fetch aggregate statistics for summary cards
  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId || !selectedSessionId) return;

      try {
        // Count total teachers for this school
        const { count: totalTeachers } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        // Count active teachers (with completed accounts)
        const { count: activeTeachers } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('invitation_status', 'completed');

        // Count pending teacher invites
        const { count: pendingInvites } = await supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('invitation_status', 'pending');

        // Count total students for this school and session
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('academic_session_id', selectedSessionId);

        setStats({
          totalTeachers: totalTeachers ?? 0,
          activeTeachers: activeTeachers ?? 0,
          pendingInvites: pendingInvites ?? 0,
          totalStudents: totalStudents ?? 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [schoolId, selectedSessionId]);

  // Fetch classes for teacher users
  useEffect(() => {
    if (userRole !== 'teacher' || !user?.id) {
      setTeacherClasses([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('class_teachers')
        .select('classes(class_name)')
        .eq('teacher_id', user.id);
      const names = (data || [])
        .map((ct: any) => ct.classes?.class_name as string | undefined)
        .filter(Boolean) as string[];
      setTeacherClasses(names);
    })();
  }, [userRole, user?.id]);

  // Fetch temporary transportation overrides for students (active today)
  useEffect(() => {
    const fetchTempTransportation = async () => {
      if (!schoolId || people.length === 0) return;

      const studentIds = people.filter(p => p.role === 'Student').map(p => p.id);
      if (studentIds.length === 0) return;

      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data, error } = await supabase
          .rpc('get_active_temp_transportation', {
            p_student_id: studentIds[0], // We'll call this for each student
            p_date: today
          });

        // Fetch for all students in parallel
        const promises = studentIds.map(studentId =>
          supabase.rpc('get_active_temp_transportation', {
            p_student_id: studentId,
            p_date: today
          })
        );

        const results = await Promise.all(promises);
        const tempData: Record<string, any> = {};

        results.forEach((result, index) => {
          if (result.data && result.data.length > 0) {
            tempData[studentIds[index]] = result.data[0];
          }
        });

        setTempTransportData(tempData);
      } catch (error) {
        console.error('Error fetching temporary transportation:', error);
      }
    };

    fetchTempTransportation();
  }, [schoolId, people]);

  // Fetch if ANY override exists for students (past, present, or future)
  useEffect(() => {
    const fetchAnyOverrides = async () => {
      if (!schoolId || people.length === 0) return;

      const studentIds = people.filter(p => p.role === 'Student').map(p => p.id);
      if (studentIds.length === 0) return;

      try {
        // Query the table directly to check for ANY overrides
        const { data, error } = await supabase
          .from('student_temporary_transportation')
          .select('student_id')
          .in('student_id', studentIds);

        if (error) throw error;

        // Create a map of student IDs that have ANY override configured
        const overrideMap: Record<string, boolean> = {};
        data?.forEach(record => {
          overrideMap[record.student_id] = true;
        });

        setAnyOverrideData(overrideMap);
      } catch (error) {
        console.error('Error fetching override existence:', error);
      }
    };

    fetchAnyOverrides();
  }, [schoolId, people]);

  const handleDeletePerson = async () => {
    if (!personToDelete) return;

    try {
      if (personToDelete.role === 'Student') {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', personToDelete.id);

        if (error) throw error;
      } else if (personToDelete.role === 'Teacher') {
        const { error } = await supabase
          .from('teachers')
          .delete()
          .eq('id', personToDelete.id);

        if (error) throw error;
      } else {
        // School Admin - delete from profiles and user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', personToDelete.id);

        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', personToDelete.id);

        if (roleError || profileError) throw roleError || profileError;
      }

      toast({
        title: "Success",
        description: `${personToDelete.role} deleted successfully`,
      });

      // Refresh the people list by invalidating the query
      queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
    } catch (error) {
      console.error('Error deleting person:', error);
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    }
  };

  const openDeleteDialog = (person: PersonData) => {
    setPersonToDelete(person);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (person: PersonData) => {
    setPersonToEdit(person);
    setEditDialogOpen(true);
  };

  const openTempTransportDialog = (person: PersonData) => {
    setStudentForTempTransport({
      id: person.id,
      first_name: person.firstName,
      last_name: person.lastName,
      current_transportation: person.transportation
    });
    setTempTransportDialogOpen(true);
  };

  const openViewTempTransportDialog = (person: PersonData) => {
    setStudentForTempTransport({
      id: person.id,
      first_name: person.firstName,
      last_name: person.lastName,
    });
    setViewTempTransportDialogOpen(true);
  };

  const getTransportationDisplay = (person: PersonData) => {
    const tempOverride = tempTransportData[person.id];
    const hasAnyOverride = anyOverrideData[person.id] || false;
    const isActiveToday = !!tempOverride;
    
    if (tempOverride) {
      // Get the temporary transportation description
      let tempTransport = '';
      if (tempOverride.bus_id) {
        tempTransport = `Bus`;
      } else if (tempOverride.car_line_id) {
        tempTransport = `Car Rider`;
      } else if (tempOverride.walker_location_id) {
        tempTransport = `Walker`;
      } else if (tempOverride.after_school_activity_id) {
        tempTransport = `Activity`;
      }
      return { display: tempTransport, hasTemp: isActiveToday, hasAnyOverride };
    }

    return { display: person.transportation || '-', hasTemp: false, hasAnyOverride };
  };

  const handleResendInvitation = async (person: PersonData) => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-teacher-unified', {
        body: {
          teachers: [{
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
          }],
          schoolId: schoolId,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invitation resent to ${person.email}`,
      });

      // Refresh the data by invalidating the query
      queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleCopyInvitationLink = async (person: PersonData) => {
    try {
      // Fetch the current invitation token
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('invitation_token')
        .eq('id', person.id)
        .single();

      if (error || !teacher?.invitation_token) throw new Error('No invitation token found');

      const invitationUrl = `${window.location.origin}/auth?invitationToken=${teacher.invitation_token}`;
      await navigator.clipboard.writeText(invitationUrl);

      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying invitation link:', error);
      toast({
        title: "Error",
        description: "Failed to copy invitation link",
        variant: "destructive",
      });
    }
  };

  const handleBulkInviteTeachers = async () => {
    try {
      setIsBulkInviting(true);
      
      // Filter for teachers with pending invitations
      const pendingTeachers = people.filter(p => 
        p.role === 'Teacher' && 
        (!p.invitationStatus || p.invitationStatus === 'pending')
      );
      
      if (pendingTeachers.length === 0) {
        toast({
          title: "No Pending Invitations",
          description: "All teachers have already been invited.",
        });
        return;
      }
      
      // Prepare bulk invitation request
      const teachersToInvite = pendingTeachers.map(t => ({
        email: t.email!,
        firstName: t.firstName,
        lastName: t.lastName,
      }));
      
      const { data, error } = await supabase.functions.invoke('invite-teacher-unified', {
        body: {
          teachers: teachersToInvite,
          schoolId: schoolId,
        },
      });
      
      if (error) throw error;
      
      const successCount = data?.success || 0;
      const errorCount = data?.errors?.length || 0;
      
      toast({
        title: "Invitations Sent",
        description: `Successfully sent ${successCount} invitation(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      });
      
      // Refresh the people list
      queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
      
    } catch (error) {
      console.error('Error sending bulk invitations:', error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'School Admin':
        return <User className="h-4 w-4" />;
      case 'Teacher':
        return <UserCheck className="h-4 w-4" />;
      case 'Student':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'School Admin':
        return 'default';
      case 'Teacher':
        return 'secondary';
      case 'Student':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Map display roles to filter roles
  const mapRoleToFilter = (role: 'all' | 'School Admin' | 'Teacher' | 'Student'): 'all' | 'school_admin' | 'teacher' | 'student' => {
    if (role === 'School Admin') return 'school_admin';
    if (role === 'Teacher') return 'teacher';
    if (role === 'Student') return 'student';
    return 'all';
  };

  // Reset page when filters change
  const handleFilterChange = (newFilterRole?: 'all' | 'School Admin' | 'Teacher' | 'Student', newFilterGrade?: string) => {
    setCurrentPage(1);
    if (newFilterRole !== undefined) {
      const mappedRole = mapRoleToFilter(newFilterRole);
      setFilterRole(mappedRole);
    }
    if (newFilterGrade !== undefined) {
      setFilterGrade(newFilterGrade);
    }
  };

  const handleSortChange = (column: typeof sortBy) => {
    setCurrentPage(1);
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ column, children }: { column: typeof sortBy; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSortChange(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          <ChevronUp className={cn("h-3 w-3 -mb-1", sortBy === column && sortOrder === 'asc' ? "text-foreground" : "text-muted-foreground/40")} />
          <ChevronDown className={cn("h-3 w-3 -mt-1", sortBy === column && sortOrder === 'desc' ? "text-foreground" : "text-muted-foreground/40")} />
        </div>
      </div>
    </TableHead>
  );

  // Pagination logic - now using server-side totalCount
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // For school admins, show the sidebar layout
  if (userRole === 'school_admin' || userRole === 'district_admin') {
    return (
      <>
        <SEO />
      <main className="flex-1 min-w-0 px-4 py-6 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
          {schoolId && <TeachersWithoutClassesAlert schoolId={schoolId} />}
          
          {/* Statistics Cards */}
          {isMobile ? (
            <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-4 py-3 bg-card border rounded-lg hover:bg-accent transition-colors">
                  <span className="font-semibold text-lg">Stats</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3 w-full">
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalTeachers}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.activeTeachers}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-elevated border-0 bg-blue-50/80 dark:bg-blue-950/20 backdrop-blur border-blue-200 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      Pending Invites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.pendingInvites}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalStudents}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalTeachers}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.activeTeachers}
                    </div>
                  </CardContent>
                </Card>
                
          <Card className="shadow-elevated border-0 bg-blue-50/80 dark:bg-blue-950/20 backdrop-blur border-blue-200 max-w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Pending Invites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.pendingInvites}
              </div>
            </CardContent>
          </Card>
                
                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalStudents}
                    </div>
                  </CardContent>
                </Card>
              </div>
          )}


              <Card className="shadow-elevated border-0 bg-card backdrop-blur max-w-full">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                     <div>
                       <CardTitle className="flex items-center gap-3">
                         People Management
                         {selectedSessionId && academicSessions.length > 0 && (
                           <Badge variant="secondary" className="text-xs font-normal">
                             {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                           </Badge>
                         )}
                       </CardTitle>
                       <CardDescription className="mt-2">
                         Manage students, teachers, and administrators
                       </CardDescription>
                     </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/dashboard/people/archived')}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        View Archived
                      </Button>
                      {schoolId && (
                        <AddPersonDialog 
                          schoolId={schoolId} 
                          onPersonAdded={() => {
                            console.log('Person added, refreshing data...');
                            queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
                          }} 
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                 <CardContent>

                   {/* Filters and Sort Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/30 rounded-lg border">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>

                    {/* Academic Session Filter */}
                    {academicSessions.length > 0 && (
                      <Select value={selectedSessionId || ''} onValueChange={(value) => setSelectedSessionId(value)}>
                        <SelectTrigger className="h-8 w-full sm:w-48 text-sm">
                          <SelectValue placeholder="Session" />
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

                    <div className="hidden sm:block h-4 w-px bg-border" />
                    
                    {/* Role Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto">
                          Role: {filterRole === 'all' ? 'All' : filterRole === 'school_admin' ? 'School Admin' : filterRole === 'teacher' ? 'Teacher' : 'Student'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                          All Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('School Admin')}>
                          School Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('Teacher')}>
                          Teacher
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('Student')}>
                          Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Grade Filter - Limited options for server-side filtering */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto">
                          Grade: {filterGrade === 'all' ? 'All' : filterGrade}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, 'all')}>
                          All Grades
                        </DropdownMenuItem>
                        {['K', '1st', '2nd', '3rd', '4th', '5th', '6th'].map((grade) => (
                          <DropdownMenuItem key={grade} onClick={() => handleFilterChange(undefined, grade)}>
                            {grade}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Results count */}
                    <div className="w-full sm:w-auto sm:ml-auto text-left sm:text-right text-sm text-muted-foreground">
                      Showing {startIndex}-{endIndex} of {totalCount} people
                    </div>
                  </div>
                  {isTabletOrMobile ? (
                    // CARD LAYOUT FOR MOBILE/TABLET
                    <div className="space-y-3 w-full">
                      {people.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No people found matching your filters.
                        </div>
                      ) : (
                        people.map((person) => {
                          const transportDisplay = getTransportationDisplay(person);
                          return (
                             <Card key={person.id} className="border shadow-sm w-full max-w-full">
                              <CardContent className="pt-6 space-y-3">
                                 {/* Name & Role */}
                                 <div className="flex flex-wrap items-start gap-3">
                                   <div className="flex items-center gap-3 min-w-0">
                                     <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                       {getRoleIcon(person.role)}
                                     </div>
                                     <div className="min-w-0">
                                       <p className="font-semibold text-base truncate">
                                         {person.firstName} {person.lastName}
                                       </p>
                                       <Badge variant={getRoleBadgeVariant(person.role)} className="text-xs mt-1">
                                         {person.role}
                                       </Badge>
                                     </div>
                                   </div>
                                   <div className="sm:ml-auto">
                                     <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                                      <DropdownMenuItem onClick={() => openEditDialog(person)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      {person.role === 'Student' && (
                                        <DropdownMenuItem onClick={() => openTempTransportDialog(person)}>
                                          <CalendarIcon className="h-4 w-4 mr-2" />
                                          Temp Transportation
                                        </DropdownMenuItem>
                                      )}
                                      {person.role === 'Teacher' && person.invitationStatus === 'pending' && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleResendInvitation(person)}>
                                            <Mail className="h-4 w-4 mr-2" />
                                            Resend Invitation
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCopyInvitationLink(person)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy Link
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={() => openDeleteDialog(person)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </div>
                               </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t text-sm">
                                  {person.role === 'Student' && (
                                    <>
                                      <div>
                                        <p className="text-muted-foreground text-xs mb-1">Grade</p>
                                        <p className="font-medium">{person.grade || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground text-xs mb-1">Transportation</p>
                                        {transportDisplay.hasTemp || transportDisplay.hasAnyOverride ? (
                                          <Badge 
                                            variant="outline"
                                            className={cn(
                                              "cursor-pointer hover:bg-accent",
                                              transportDisplay.hasAnyOverride && 
                                              "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700"
                                            )}
                                            onClick={() => {
                                              if (transportDisplay.hasAnyOverride) {
                                                openViewTempTransportDialog(person);
                                              } else {
                                                openTempTransportDialog(person);
                                              }
                                            }}
                                          >
                                            {transportDisplay.display}
                                            {transportDisplay.hasTemp && (
                                              <span className="text-amber-600 dark:text-amber-400 ml-1"> (Temp)</span>
                                            )}
                                            {transportDisplay.hasAnyOverride && (
                                              <span className="text-amber-600 dark:text-amber-400 ml-1">*</span>
                                            )}
                                          </Badge>
                                        ) : (
                                          <p className="font-medium">{person.transportation || '-'}</p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  
                                  {person.classes && person.classes.length > 0 && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground text-xs mb-1">Classes</p>
                                      <div className="flex flex-wrap gap-1">
                                        {person.classes.map((className, index) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {className}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {person.role === 'Teacher' && person.invitationStatus && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground text-xs mb-1">Status</p>
                                      <div className="flex items-center gap-2">
                                        {person.invitationStatus === 'completed' && (
                                          <>
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <Badge variant="outline" className="bg-green-50 border-green-200">Active</Badge>
                                          </>
                                        )}
                                        {person.invitationStatus === 'pending' && (
                                          <>
                                            <Clock className="h-4 w-4 text-orange-600" />
                                            <Badge variant="outline" className="bg-orange-50 border-orange-200">
                                              Pending {person.daysUntilExpiry !== null && person.daysUntilExpiry > 0 
                                                ? `(${person.daysUntilExpiry}d)` 
                                                : person.daysUntilExpiry === 0 
                                                ? '(Expires today)' 
                                                : ''}
                                            </Badge>
                                          </>
                                        )}
                                        {person.invitationStatus === 'expired' && (
                                          <>
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            <Badge variant="outline" className="bg-red-50 border-red-200">Expired</Badge>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    // TABLE LAYOUT FOR DESKTOP
                  <div className="rounded-md border bg-background/50 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
          <SortableHeader column="name">Name</SortableHeader>
          <SortableHeader column="role">Role</SortableHeader>
          <SortableHeader column="grade">Grade</SortableHeader>
                        <TableHead>Transportation</TableHead>
                        <TableHead>Classes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {people.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{person.firstName} {person.lastName}</span>
                              {person.role === 'Teacher' && person.invitationStatus && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button className="inline-flex items-center">
                                      {person.invitationStatus === 'completed' && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      )}
                                      {person.invitationStatus === 'pending' && (
                                        <Clock className="h-4 w-4 text-orange-600" />
                                      )}
                                      {person.invitationStatus === 'expired' && (
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                      )}
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80" side="right">
                                    {person.invitationStatus === 'completed' && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                          <h4 className="font-semibold text-green-600">Active Account</h4>
                                        </div>
                                        <div className="text-sm space-y-1">
                                          <p className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Auth Method:</span>
                                            <Badge variant="outline">
                                              {person.authProvider === 'google' ? '🔵 Google' : 
                                               person.authProvider === 'microsoft' ? '🟦 Microsoft' : 
                                               '📧 Email'}
                                            </Badge>
                                          </p>
                                          {person.accountCompletedAt && (
                                            <p className="text-muted-foreground">
                                              Completed: {format(new Date(person.accountCompletedAt), 'MMM d, yyyy')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {person.invitationStatus === 'pending' && (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-5 w-5 text-orange-600" />
                                          <h4 className="font-semibold text-orange-600">Invitation Pending</h4>
                                        </div>
                                        <div className="text-sm space-y-1">
                                          {person.invitationSentAt && (
                                            <p className="text-muted-foreground">
                                              Sent: {format(new Date(person.invitationSentAt), 'MMM d, yyyy')}
                                            </p>
                                          )}
                                          {person.daysUntilExpiry !== undefined && (
                                            <p className="text-muted-foreground">
                                              Expires: {person.daysUntilExpiry > 0 
                                                ? `in ${person.daysUntilExpiry} day${person.daysUntilExpiry !== 1 ? 's' : ''}`
                                                : 'today'}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t">
                                          <Button size="sm" variant="outline" onClick={() => handleResendInvitation(person)}>
                                            <Mail className="h-3 w-3 mr-1" />
                                            Resend
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => handleCopyInvitationLink(person)}>
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copy Link
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {person.invitationStatus === 'expired' && (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-5 w-5 text-red-600" />
                                          <h4 className="font-semibold text-red-600">Invitation Expired</h4>
                                        </div>
                                        <div className="text-sm space-y-1">
                                          {person.invitationSentAt && (
                                            <p className="text-muted-foreground">
                                              Originally sent: {format(new Date(person.invitationSentAt), 'MMM d, yyyy')}
                                            </p>
                                          )}
                                          {person.invitationExpiresAt && (
                                            <p className="text-muted-foreground">
                                              Expired: {format(new Date(person.invitationExpiresAt), 'MMM d, yyyy')}
                                            </p>
                                          )}
                                        </div>
                                        <div className="pt-2 border-t">
                                          <Button 
                                            size="sm" 
                                            variant="default" 
                                            className="w-full"
                                            onClick={() => handleResendInvitation(person)}
                                          >
                                            <Mail className="h-3 w-3 mr-1" />
                                            Resend Invitation
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(person.role)} className="flex items-center gap-1 w-fit">
                              {getRoleIcon(person.role)}
                              {person.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{person.grade || '-'}</TableCell>
                          <TableCell>
                            {person.role === 'Student' ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "cursor-pointer hover:bg-accent",
                                  getTransportationDisplay(person).hasAnyOverride && 
                                  "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700"
                                )}
                                onClick={() => {
                                  if (getTransportationDisplay(person).hasAnyOverride) {
                                    openViewTempTransportDialog(person);
                                  } else {
                                    openTempTransportDialog(person);
                                  }
                                }}
                              >
                                {getTransportationDisplay(person).display}
                                {getTransportationDisplay(person).hasTemp && (
                                  <span className="text-amber-600 dark:text-amber-400 ml-1"> (Temp)</span>
                                )}
                                {getTransportationDisplay(person).hasAnyOverride && (
                                  <span className="text-amber-600 dark:text-amber-400 ml-1">*</span>
                                )}
                              </Badge>
                            ) : (
                              person.transportation || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {person.classes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {person.classes.map((className, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {className}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                                <DropdownMenuItem onClick={() => openEditDialog(person)} className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                
                                {person.role === 'Teacher' && 
                                 (person.invitationStatus === 'pending' || person.invitationStatus === 'expired') && (
                                  <DropdownMenuItem onClick={() => handleResendInvitation(person)} className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}
                                
                                {person.role === 'Teacher' && person.invitationStatus === 'pending' && (
                                  <DropdownMenuItem onClick={() => handleCopyInvitationLink(person)} className="flex items-center gap-2">
                                    <Copy className="h-4 w-4" />
                                    Copy Invitation Link
                                  </DropdownMenuItem>
                                )}

                                {person.role === 'Teacher' && person.classIds && person.classIds.length > 0 && (
                                  <AssignClassCoverageDialog
                                    classId={person.classIds?.[0] || ''}
                                    className={person.classes?.[0] || 'Class'}
                                    availableTeachers={people.filter(p => p.role === 'Teacher' && p.id !== person.id).map(t => ({
                                      id: t.id,
                                      first_name: t.firstName,
                                      last_name: t.lastName,
                                      email: t.email || ''
                                    }))}
                                    onCoverageAssigned={() => queryClient.invalidateQueries({ queryKey: ['people-paginated'] })}
                                  />
                                )}

                                {person.role === 'Student' && (
                                  <DropdownMenuItem onClick={() => openViewTempTransportDialog(person)} className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Manage Temporary Transportation
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(person)} 
                                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  )}

                  {people.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No people found. Import a roster to get started.
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {people.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                      <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                        Showing {startIndex} to {endIndex} of {totalCount} people
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Person</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {personToDelete?.firstName} {personToDelete?.lastName}? 
                This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePerson}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {schoolId && (
          <EditPersonDialog
            person={personToEdit}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            schoolId={schoolId}
            onPersonUpdated={() => {
              console.log('Person updated, refreshing data...');
              queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
            }}
          />
        )}

        {studentForTempTransport && schoolId && (
          <>
            <TemporaryTransportationDialog
              student={studentForTempTransport}
              open={tempTransportDialogOpen}
              onOpenChange={setTempTransportDialogOpen}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
                // Refresh temp transport data
                setTempTransportData({});
              }}
              schoolId={schoolId}
            />

            <ViewTemporaryTransportationDialog
              student={studentForTempTransport}
              open={viewTempTransportDialogOpen}
              onOpenChange={setViewTempTransportDialogOpen}
              onEdit={() => {
                setViewTempTransportDialogOpen(false);
                setTempTransportDialogOpen(true);
              }}
            />
          </>
        )}
      </>
    );
  }

  // For non-admin users, show the original layout
  return (
    <>
      <SEO />
      <main className="flex-1 min-w-0 px-4 py-6 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
        <div className="space-y-6">
          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                People Management
              </CardTitle>
            <CardDescription>
              {userRole === 'teacher' 
                ? 'Manage class students and fellow teachers'
                : 'View students, teachers, and administrators'}
            </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Sort Controls */}
              <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/30 rounded-lg border w-full">
                {userRole !== 'teacher' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>
                    
                    {/* Role Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto">
                          Role: {filterRole === 'all' ? 'All' : filterRole}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                          All Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('School Admin')}>
                          School Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('Teacher')}>
                          Teacher
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('Student')}>
                          Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Grade Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto">
                          Grade: {filterGrade === 'all' ? 'All' : filterGrade}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, 'all')}>
                          All Grades
                        </DropdownMenuItem>
                        {['K', '1st', '2nd', '3rd', '4th', '5th', '6th'].map((grade) => (
                          <DropdownMenuItem key={grade} onClick={() => handleFilterChange(undefined, grade)}>
                            {grade}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="hidden sm:block h-4 w-px bg-border mx-2" />
                  </>
                )}

                {/* Results count */}
                <div className="w-full sm:w-auto sm:ml-auto text-left sm:text-right text-sm text-muted-foreground">
                  Showing {startIndex}-{endIndex} of {totalCount} people
                </div>
              </div>

              {isTabletOrMobile ? (
                // CARD LAYOUT FOR MOBILE/TABLET
                <div className="space-y-3 w-full">
                  {people.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No people found.
                    </div>
                  ) : (
                    people.map((person) => {
                      const transportDisplay = getTransportationDisplay(person);
                      return (
                        <Card key={person.id} className="border shadow-sm w-full max-w-full">
                          <CardContent className="pt-6 space-y-3">
                            {/* Name & Role */}
                            <div className="flex flex-wrap items-start gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  {getRoleIcon(person.role)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-base truncate">
                                    {person.firstName} {person.lastName}
                                  </p>
                                  <Badge variant={getRoleBadgeVariant(person.role)} className="text-xs mt-1">
                                    {person.role}
                                  </Badge>
                                </div>
                              </div>
                              {userRole === 'school_admin' && (
                                <div className="sm:ml-auto">
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                                    <DropdownMenuItem onClick={() => openEditDialog(person)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    {person.role === 'Student' && (
                                      <DropdownMenuItem onClick={() => openTempTransportDialog(person)}>
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Temp Transportation
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => openDeleteDialog(person)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t text-sm">
                              {person.role === 'Student' && (
                                <>
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Grade</p>
                                    <p className="font-medium">{person.grade || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">Transportation</p>
                                    {transportDisplay.hasTemp || transportDisplay.hasAnyOverride ? (
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          "cursor-pointer hover:bg-accent",
                                          transportDisplay.hasAnyOverride && 
                                          "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700"
                                        )}
                                        onClick={() => {
                                          if (transportDisplay.hasAnyOverride) {
                                            openViewTempTransportDialog(person);
                                          } else {
                                            openTempTransportDialog(person);
                                          }
                                        }}
                                      >
                                        {transportDisplay.display}
                                        {transportDisplay.hasTemp && (
                                          <span className="text-amber-600 dark:text-amber-400 ml-1"> (Temp)</span>
                                        )}
                                        {transportDisplay.hasAnyOverride && (
                                          <span className="text-amber-600 dark:text-amber-400 ml-1">*</span>
                                        )}
                                      </Badge>
                                    ) : (
                                      <p className="font-medium">{person.transportation || '-'}</p>
                                    )}
                                  </div>
                                </>
                              )}
                              
                              {userRole !== 'teacher' && person.classes && person.classes.length > 0 && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-xs mb-1">Classes</p>
                                  <div className="flex flex-wrap gap-1">
                                    {person.classes.map((className, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {className}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                // TABLE LAYOUT FOR DESKTOP
              <div className="rounded-md border bg-background/50 overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader column="name">Name</SortableHeader>
                      <SortableHeader column="role">Role</SortableHeader>
                      <SortableHeader column="grade">Grade</SortableHeader>
                      <TableHead>Transportation</TableHead>
                      {userRole !== 'teacher' && <TableHead>Classes</TableHead>}
                      {userRole === 'school_admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">
                        {person.firstName} {person.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(person.role)} className="flex items-center gap-1 w-fit">
                          {getRoleIcon(person.role)}
                          {person.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{person.grade || '-'}</TableCell>
                      <TableCell>
                        {person.role === 'Student' ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "cursor-pointer hover:bg-accent",
                              getTransportationDisplay(person).hasAnyOverride && 
                              "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700"
                            )}
                            onClick={() => {
                              if (getTransportationDisplay(person).hasAnyOverride) {
                                openViewTempTransportDialog(person);
                              } else {
                                openTempTransportDialog(person);
                              }
                            }}
                          >
                            {getTransportationDisplay(person).display}
                            {getTransportationDisplay(person).hasTemp && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1"> (Temp)</span>
                            )}
                            {getTransportationDisplay(person).hasAnyOverride && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1">*</span>
                            )}
                          </Badge>
                        ) : (
                          person.transportation || '-'
                        )}
                      </TableCell>
                      {userRole !== 'teacher' && (
                        <TableCell>
                          {person.classes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {person.classes.map((className, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {className}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                      {userRole === 'school_admin' && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                              <DropdownMenuItem onClick={() => openEditDialog(person)} className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>

                              {person.role === 'Student' && (
                                <DropdownMenuItem onClick={() => openViewTempTransportDialog(person)} className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  Manage Temporary Transportation
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(person)} 
                                className="flex items-center gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              )}

              {people.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No people found.
                </div>
              )}

              {/* Pagination Controls */}
              {people.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                  <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                    Showing {startIndex} to {endIndex} of {totalCount} people
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add edit dialog for non-admin users too */}
        {schoolId && (
          <>
            <EditPersonDialog
              person={personToEdit}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              schoolId={schoolId}
              onPersonUpdated={() => {
                console.log('Person updated, refreshing data...');
                queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
              }}
            />

            {studentForTempTransport && (
              <>
                <TemporaryTransportationDialog
                  student={studentForTempTransport}
                  open={tempTransportDialogOpen}
                  onOpenChange={setTempTransportDialogOpen}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
                    // Refresh temp transport data
                    setTempTransportData({});
                  }}
                  schoolId={schoolId}
                />

                <ViewTemporaryTransportationDialog
                  student={studentForTempTransport}
                  open={viewTempTransportDialogOpen}
                  onOpenChange={setViewTempTransportDialogOpen}
                  onEdit={() => {
                    setViewTempTransportDialogOpen(false);
                    setTempTransportDialogOpen(true);
                  }}
                />
              </>
            )}
          </>
        )}
    </main>
    </>
  );
};

export default People;