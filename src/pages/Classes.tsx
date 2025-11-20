import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
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

import { Users, GraduationCap, BarChart3, Calendar, Plus, Search, ChevronDown, MoreHorizontal, Edit, UserPlus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AddPersonDialog } from "@/components/AddPersonDialog";
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
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
    });
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
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          schoolId: schoolId
        }
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      if (result.success > 0) {
        toast.success(`Teacher invitation sent to ${formData.email}`);
        
        // Add the teacher optimistically
        const newTeacher: Teacher = {
          id: result.invitations[0]?.teacherId || crypto.randomUUID(),
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          school_id: schoolId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        onTeacherAdded(newTeacher);
        setFormData({ firstName: '', lastName: '', email: '' });
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
          <DialogDescription>
            Create a new teacher account for your school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Teacher'}
            </Button>
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

const Classes = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const isMobile = useIsMobile();
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);

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
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof ClassRecord>('class_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterGrade, setFilterGrade] = useState<'all' | '6' | '7' | '8'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClassRecord | null>(null);
  
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherSearchResults, setTeacherSearchResults] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();
  const [managingClass, setManagingClass] = useState<ClassRecord | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && userRole !== 'school_admin') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [schoolId]);

  const fetchClasses = async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);

      // Fetch classes without nested class_rosters query to avoid RLS recursion
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_teachers(
            teachers(first_name, last_name)
          )
        `)
        .eq('school_id', schoolId);

      console.log('Classes query result:', { classesData, error, schoolId });

      if (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes data');
        return;
      }

      // Fetch student counts separately for each class
      const classRecords: ClassRecord[] = [];
      if (classesData) {
        for (const classItem of classesData) {
          const { count: studentCount } = await supabase
            .from('class_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id);

          classRecords.push({
            id: classItem.id,
            class_name: classItem.class_name,
            grade_level: classItem.grade_level || '',
            room_number: classItem.room_number,
            teacher_name: classItem.class_teachers?.[0]?.teachers 
              ? `${classItem.class_teachers[0].teachers.first_name} ${classItem.class_teachers[0].teachers.last_name}`
              : null,
            student_count: studentCount || 0,
            created_at: classItem.created_at,
            updated_at: classItem.updated_at,
          });
        }
      }

      setClasses(classRecords);
      setFilteredClasses(classRecords);
    } catch (error) {
      console.error('Error fetching classes data:', error);
      toast.error('Failed to load classes data');
    } finally {
      setIsLoading(false);
    }
  };


  const fetchTeachers = async () => {
    if (!schoolId) return;

    try {
      // Query profiles with teacher role
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            email,
            school_id,
            created_at,
            updated_at
          )
        `)
        .eq('role', 'teacher')
        .eq('profiles.school_id', schoolId);

      if (error) {
        console.error('Error fetching teachers:', error);
        return;
      }

      // Map the results to Teacher[] format
      const teachers = userRoles?.map(ur => ur.profiles).filter(Boolean) || [];
      setAvailableTeachers(teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const searchTeachers = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setTeacherSearchResults([]);
      return;
    }
    
    const filtered = availableTeachers.filter(teacher => 
      teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${teacher.first_name} ${teacher.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setTeacherSearchResults(filtered);
  };

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

  const handlePersonAdded = () => {
    fetchTeachers(); // Refresh teachers list
  };

  const handleTeacherAdded = (teacher: Teacher) => {
    fetchTeachers(); // Refresh teachers list
    handleTeacherSelect(teacher); // Auto-select the new teacher
  };

  // Search and filter logic
  useEffect(() => {
    let filtered = classes.filter(record => {
      const matchesSearch = 
        record.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.teacher_name && record.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        record.grade_level.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGrade = filterGrade === 'all' || record.grade_level === filterGrade;
      
      return matchesSearch && matchesGrade;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredClasses(filtered);
    setCurrentPage(1);
  }, [classes, searchTerm, filterGrade, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClasses = filteredClasses.slice(startIndex, endIndex);

  // Summary stats
  const summaryStats = {
    totalClasses: classes.length,
    totalStudents: classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0),
    totalTeachers: new Set(classes.filter(cls => cls.teacher_name).map(cls => cls.teacher_name)).size,
    avgClassSize: classes.length > 0 
      ? (classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0) / classes.length).toFixed(1)
      : '0.0'
  };

  const handleFilterChange = (newFilterGrade?: typeof filterGrade) => {
    setCurrentPage(1);
    if (newFilterGrade !== undefined) setFilterGrade(newFilterGrade);
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder?: typeof sortOrder) => {
    setSortBy(newSortBy);
    if (newSortOrder) setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case '6':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">6th Grade</Badge>;
      case '7':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">7th Grade</Badge>;
      case '8':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">8th Grade</Badge>;
      default:
        return <Badge variant="secondary">{grade}</Badge>;
    }
  };

  const form = useForm<z.infer<typeof editClassSchema>>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      class_name: "",
      grade_level: "",
      room_number: "",
      teacher_id: "",
    },
  });

  useEffect(() => {
    if (editingRecord) {
      form.reset({
        class_name: editingRecord.class_name,
        grade_level: editingRecord.grade_level,
        room_number: editingRecord.room_number || "",
        teacher_id: "",
      });
      
      // Fetch and set the current teacher for this class
      fetchCurrentTeacher(editingRecord.id);
    } else if (showAddDialog) {
      form.reset({
        class_name: "",
        grade_level: "",
        room_number: "",
        teacher_id: "",
      });
      clearTeacherSelection();
    }
  }, [editingRecord, showAddDialog, form]);

  const fetchCurrentTeacher = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_teachers')
        .select(`
          teachers(id, first_name, last_name)
        `)
        .eq('class_id', classId)
        .limit(1);

      if (error) {
        console.error('Error fetching current teacher:', error);
        return;
      }

      if (data && data.length > 0 && data[0].teachers) {
        const teacher = data[0].teachers as Teacher;
        setSelectedTeacher(teacher);
        setTeacherSearchTerm(`${teacher.first_name} ${teacher.last_name}`);
        form.setValue('teacher_id', teacher.id);
      } else {
        clearTeacherSelection();
      }
    } catch (error) {
      console.error('Error fetching current teacher:', error);
    }
  };

  const handleEditClass = async (values: z.infer<typeof editClassSchema>) => {
    if (!editingRecord) return;

    try {
      // Update class information
      const { error: classError } = await supabase
        .from('classes')
        .update({
          class_name: values.class_name,
          grade_level: values.grade_level,
          room_number: values.room_number || null,
        })
        .eq('id', editingRecord.id);

      if (classError) {
        console.error('Error updating class:', classError);
        toast.error('Failed to update class information');
        return;
      }

      // Handle teacher assignment changes
      // First, remove existing teacher assignment
      await supabase
        .from('class_teachers')
        .delete()
        .eq('class_id', editingRecord.id);

      // If a teacher is selected, assign them to the class
      if (values.teacher_id) {
        const { error: teacherError } = await supabase
          .from('class_teachers')
          .insert({
            class_id: editingRecord.id,
            teacher_id: values.teacher_id,
          });

        if (teacherError) {
          console.error('Error assigning teacher:', teacherError);
          toast.error('Class updated but failed to assign teacher');
          return;
        }
      }

      toast.success('Class information updated successfully');
      setEditingRecord(null);
      clearTeacherSelection();
      form.reset();
      fetchClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error('Failed to update class information');
    }
  };

  const handleAddClass = async (values: z.infer<typeof editClassSchema>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) {
        toast.error('Unable to determine school information');
        return;
      }

      // First create the class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert({
          class_name: values.class_name,
          grade_level: values.grade_level,
          room_number: values.room_number || null,
          school_id: profile.school_id,
        })
        .select()
        .single();

      if (classError) {
        console.error('Error creating class:', classError);
        toast.error('Failed to create class');
        return;
      }

      // If a teacher is selected, assign them to the class
      if (values.teacher_id && classData) {
        const { error: teacherError } = await supabase
          .from('class_teachers')
          .insert({
            class_id: classData.id,
            teacher_id: values.teacher_id,
          });

        if (teacherError) {
          console.error('Error assigning teacher:', teacherError);
          toast.error('Class created but failed to assign teacher');
        }
      }

      toast.success('Class created successfully');
      setShowAddDialog(false);
      clearTeacherSelection();
      form.reset();
      fetchClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    }
  };

  const handleFormSubmit = (values: z.infer<typeof editClassSchema>) => {
    if (editingRecord) {
      handleEditClass(values);
    } else {
      handleAddClass(values);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'school_admin') {
    return null;
  }

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
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.totalClasses}</div>
                    <p className="text-xs text-muted-foreground">
                      Active classes this session
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">
                      Students enrolled
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.totalTeachers}</div>
                    <p className="text-xs text-muted-foreground">
                      Teachers assigned
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.avgClassSize}</div>
                    <p className="text-xs text-muted-foreground">
                      Students per class
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalClasses}</div>
                <p className="text-xs text-muted-foreground">
                  Active classes this session
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  Students enrolled
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalTeachers}</div>
                <p className="text-xs text-muted-foreground">
                  Teachers assigned
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.avgClassSize}</div>
                <p className="text-xs text-muted-foreground">
                  Students per class
                </p>
              </CardContent>
            </Card>
          </div>
        )}

            {/* Classes Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl">Classes Management</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Manage school classes, teachers, and student assignments
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)} className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search classes or teachers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Grade Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10">
                          Grade: {filterGrade === 'all' ? 'All' : `${filterGrade}th`}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                          All Grades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('6')}>
                          6th Grade
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('7')}>
                          7th Grade
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('8')}>
                          8th Grade
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Classes Table/Cards */}
            {isTabletOrMobile ? (
                    <div className="space-y-3">
                      {currentClasses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {searchTerm || filterGrade !== 'all' 
                            ? 'No classes match your search criteria.' 
                            : 'No classes found. Add your first class to get started.'}
                        </div>
                      ) : (
                        currentClasses.map((classRecord) => (
                          <Card key={classRecord.id} className="border">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">
                                    {classRecord.class_name}
                                  </CardTitle>
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
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setManagingClass(classRecord)}>
                                      <Users className="h-4 w-4 mr-2" />
                                      Manage Students
                                    </DropdownMenuItem>
                                    <AssignClassCoverageDialog
                                      classId={classRecord.id}
                                      className={classRecord.class_name}
                                      availableTeachers={availableTeachers.map(t => ({
                                        id: t.id,
                                        first_name: t.first_name,
                                        last_name: t.last_name,
                                        email: t.email
                                      }))}
                                      onCoverageAssigned={fetchClasses}
                                    />
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Grade:</span>
                                {getGradeBadge(classRecord.grade_level)}
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
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => handleSortChange('class_name', sortBy === 'class_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              Class Name
                              {sortBy === 'class_name' && (
                                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => handleSortChange('teacher_name', sortBy === 'teacher_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              Teacher
                              {sortBy === 'teacher_name' && (
                                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => handleSortChange('grade_level', sortBy === 'grade_level' && sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              Grade
                              {sortBy === 'grade_level' && (
                                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </TableHead>
                            <TableHead className="w-[50px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentClasses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                {searchTerm || filterGrade !== 'all' 
                                  ? 'No classes match your search criteria.' 
                                  : 'No classes found. Add your first class to get started.'
                                }
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentClasses.map((classRecord) => (
                              <TableRow key={classRecord.id} className="border-border hover:bg-muted/30">
                                <TableCell className="font-medium">{classRecord.class_name}</TableCell>
                                <TableCell>{classRecord.teacher_name || 'No teacher assigned'}</TableCell>
                                <TableCell>{getGradeBadge(classRecord.grade_level)}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                      <DropdownMenuItem onClick={() => setEditingRecord(classRecord)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setManagingClass(classRecord)}>
                                        <Users className="h-4 w-4 mr-2" />
                                        Manage Students
                                      </DropdownMenuItem>
                                      <AssignClassCoverageDialog
                                        classId={classRecord.id}
                                        className={classRecord.class_name}
                                        availableTeachers={availableTeachers.map(t => ({
                                          id: t.id,
                                          first_name: t.first_name,
                                          last_name: t.last_name,
                                          email: t.email
                                        }))}
                                        onCoverageAssigned={fetchClasses}
                                      />
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
                  {totalPages > 1 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} classes
                      </p>
                      <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex-1 md:flex-none"
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex-1 md:flex-none"
                        >
                          Next
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
        <Dialog open={showAddDialog || !!editingRecord} onOpenChange={() => {
          setShowAddDialog(false);
          setEditingRecord(null);
          clearTeacherSelection();
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Class Information' : 'Add New Class'}</DialogTitle>
              <DialogDescription>
                {editingRecord 
                  ? 'Update the class details below. Click save when you\'re done.'
                  : 'Enter the new class details below. Click save to add the class.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="class_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter class name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grade_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6">6th Grade</SelectItem>
                          <SelectItem value="7">7th Grade</SelectItem>
                          <SelectItem value="8">8th Grade</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="room_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter room number (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Teacher Search */}
                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher *</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="teacher"
                          placeholder="Search for a teacher..."
                          value={teacherSearchTerm}
                          onChange={(e) => {
                            setTeacherSearchTerm(e.target.value);
                            searchTeachers(e.target.value);
                          }}
                        />
                        {selectedTeacher && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={clearTeacherSelection}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      {schoolId && (
                        <AddTeacherDialog
                          schoolId={schoolId}
                          onTeacherAdded={handleTeacherAdded}
                        />
                      )}
                    </div>
                    
                    {/* Teacher Search Results */}
                    {teacherSearchResults.length > 0 && (
                      <div className="border rounded-md bg-background max-h-32 overflow-y-auto">
                        {teacherSearchResults.map((teacher) => (
                          <div
                            key={teacher.id}
                            className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleTeacherSelect(teacher)}
                          >
                            <div className="text-sm font-medium">
                              {teacher.first_name} {teacher.last_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedTeacher && (
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-sm font-medium">
                          Selected: {selectedTeacher.first_name} {selectedTeacher.last_name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    setEditingRecord(null);
                    clearTeacherSelection();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Save Changes' : 'Add Class'}
                  </Button>
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
            onUpdated={fetchClasses}
          />
        )}
      </div>
    </>
  );
};

export default Classes;