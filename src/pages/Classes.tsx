import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, MoreHorizontal, ChevronDown, GraduationCap, Users, Calendar, BarChart3, UserPlus } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AddPersonDialog } from "@/components/AddPersonDialog";

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
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create teacher record only
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          school_id: schoolId
        })
        .select()
        .single();

      if (teacherError) throw teacherError;

      // Get school name for the invitation email
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', schoolId)
        .single();

      // Send invitation email via edge function
      const inviteUrl = `${window.location.origin}/auth?mode=teacher-signup&email=${encodeURIComponent(formData.email)}&teacher_id=${teacherData.id}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-teacher-invitation', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          schoolName: schoolData?.school_name || 'Your School',
          inviteUrl: inviteUrl
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          title: "Teacher Created",
          description: "Teacher record created but invitation email failed to send. Please contact the teacher manually.",
          variant: "default"
        });
      } else {
        toast({
          title: "Success",
          description: "Teacher created and invitation email sent successfully!"
        });
      }

      resetForm();
      setOpen(false);
      onTeacherAdded({
        id: teacherData.id,
        first_name: teacherData.first_name,
        last_name: teacherData.last_name
      });
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast({
        title: "Error",
        description: "Failed to add teacher. Please try again.",
        variant: "destructive"
      });
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
}

const Classes = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
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
  const [schoolName, setSchoolName] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherSearchResults, setTeacherSearchResults] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);
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
    fetchSchoolName();
    fetchTeachers();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_teachers(
            teachers(first_name, last_name)
          ),
          class_rosters(
            student_id
          )
        `);

      if (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes data');
        return;
      }

      const classRecords: ClassRecord[] = classesData?.map(classItem => ({
        id: classItem.id,
        class_name: classItem.class_name,
        grade_level: classItem.grade_level || '',
        room_number: classItem.room_number,
        teacher_name: classItem.class_teachers?.[0]?.teachers 
          ? `${classItem.class_teachers[0].teachers.first_name} ${classItem.class_teachers[0].teachers.last_name}`
          : null,
        student_count: classItem.class_rosters?.length || 0,
        created_at: classItem.created_at,
        updated_at: classItem.updated_at,
      })) || [];

      setClasses(classRecords);
      setFilteredClasses(classRecords);
    } catch (error) {
      console.error('Error fetching classes data:', error);
      toast.error('Failed to load classes data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchoolName = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        const { data: school } = await supabase
          .from('schools')
          .select('school_name')
          .eq('id', profile.school_id)
          .single();

        if (school?.school_name) {
          setSchoolName(school.school_name);
        }
      }
    } catch (error) {
      console.error('Error fetching school name:', error);
    }
  };

  const fetchTeachers = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('id, first_name, last_name')
          .eq('school_id', profile.school_id);

        if (teachers) {
          setAvailableTeachers(teachers);
        }
      }
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
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold">{schoolName || 'Classes'}</h1>
                <p className="text-sm text-muted-foreground">
                  Manage school classes and assignments
                </p>
              </div>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </header>

          <main className="flex-1 p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classes.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total classes offered
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {classes.reduce((sum, cls) => sum + cls.student_count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students enrolled in classes
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {availableTeachers.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Teachers in the school
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {classes.length > 0 
                      ? Math.round(classes.reduce((sum, cls) => sum + cls.student_count, 0) / classes.length)
                      : 0
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students per class
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Classes Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Classes Management</CardTitle>
                    <CardDescription>
                      Manage school classes, teachers, and student assignments
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
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

                  {/* Classes Table */}
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
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} classes
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
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
      </div>
    </SidebarProvider>
  );
};

export default Classes;