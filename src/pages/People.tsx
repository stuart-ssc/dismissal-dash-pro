import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, GraduationCap, UserCheck, User, ChevronLeft, ChevronRight, Filter, ArrowUpDown, ChevronDown, MoreHorizontal, Edit } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Navbar from "@/components/Navbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { EditPersonDialog } from "@/components/EditPersonDialog";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'School Admin' | 'Teacher' | 'Student';
  grade?: string;
  classes: string[];
  studentId?: string;
  transportation?: 'Bus' | 'Walker' | 'Car Rider' | 'After School Activities';
}

const People = () => {
  const { user, userRole, signOut, loading, session } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const { toast } = useToast();
  
  // Debug logging
  console.log('People component render:', { user: !!user, userRole, loading });
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [people, setPeople] = useState<PersonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<PersonData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<PersonData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'grade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterRole, setFilterRole] = useState<'all' | 'School Admin' | 'Teacher' | 'Student'>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterTransportation, setFilterTransportation] = useState<'all' | 'Bus' | 'Walker' | 'Car Rider' | 'After School Activities'>('all');
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate, session]);

  useEffect(() => {
    console.log('useEffect running:', { user: !!user, userRole });
    const fetchUserData = async () => {
      if (!user) {
        console.log('No user in fetchUserData, returning early');
        return;
      }
      console.log('Starting fetchUserData with user ID:', user.id);
      
      try {
        // Debug authentication
        const { data: authTest } = await supabase.auth.getUser();
        console.log('Auth debug - User ID:', user.id);
        console.log('Auth debug - Session valid:', !!authTest.user);
        
        // Get user's profile to get school_id, first_name, and last_name
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('school_id, first_name, last_name')
          .eq('id', user.id)
          .single();

        console.log('Profile fetch result:', { profile, profileError });

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');

          if (profile.school_id) {
            setSchoolId(profile.school_id);
            // Get school name
            const { data: school } = await supabase
              .from('schools')
              .select('school_name')
              .eq('id', profile.school_id)
              .single();

            if (school?.school_name) {
              setSchoolName(school.school_name);
            }

            // Fetch all people associated with the school
            console.log('About to call fetchPeople with school_id:', profile.school_id);
            await fetchPeople(profile.school_id);
            console.log('fetchPeople completed');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

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

  const fetchPeople = async (schoolId: number) => {
    setIsLoading(true);
    try {
      console.log('Fetching people for school_id:', schoolId);
      const allPeople: PersonData[] = [];

      // Fetch profiles with roles in one query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          email,
          user_roles(role)
        `)
        .eq('school_id', schoolId);

      console.log('Profiles query result:', { profilesData, profilesError });

      // Process profiles with roles
      if (profilesData) {
        for (const profile of profilesData) {
          const userRole = profile.user_roles?.[0]?.role;
          if (userRole && (userRole === 'school_admin' || userRole === 'teacher')) {
            allPeople.push({
              id: profile.id,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              email: profile.email || '',
              role: userRole === 'school_admin' ? 'School Admin' : 'Teacher',
              classes: [],
            });
          }
        }
      }

      // Fetch teachers with their classes in one query using joins
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          id, 
          first_name, 
          last_name, 
          email,
          class_teachers(
            classes(class_name, grade_level)
          )
        `)
        .eq('school_id', schoolId);

      console.log('Teachers query result:', { teachersData, teachersError });

      if (teachersData) {
        for (const teacher of teachersData) {
          // Check if this teacher is already in the list (from profiles)
          const existingTeacher = allPeople.find(p => p.email === teacher.email);
          const teacherClasses = teacher.class_teachers?.map(ct => ct.classes?.class_name).filter(Boolean) || [];
          const teacherGrade = teacher.class_teachers?.[0]?.classes?.grade_level;
          
          if (!existingTeacher) {
            allPeople.push({
              id: teacher.id,
              firstName: teacher.first_name,
              lastName: teacher.last_name,
              email: teacher.email,
              role: 'Teacher',
              grade: teacherGrade,
              classes: teacherClasses,
            });
          } else {
            // Update classes and grade for existing teacher
            existingTeacher.classes = teacherClasses;
            existingTeacher.grade = teacherGrade;
          }
        }
      }

      // Fetch students with their classes in one query using joins, ordered by newest first
      const { data: studentsData, error: studentsError, count } = await supabase
        .from('students')
        .select(`
          id, 
          student_id, 
          first_name, 
          last_name, 
          grade_level,
          class_rosters(
            classes(class_name)
          ),
          student_bus_assignments(bus_id),
          student_walker_assignments(walker_location_id),
          student_car_assignments(car_line_id),
          student_after_school_assignments(id)
        `, { count: 'exact' })
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(2000); // Increase limit to ensure we get all students

      console.log('Students query result:', { studentsData, studentsError, schoolId, count });
      
      // Specifically check for Terri Tester
      const terriInData = studentsData?.find(s => s.first_name === 'Terri' && s.last_name === 'Tester');
      console.log('Terri Tester in students data:', terriInData);

      if (studentsData) {
        console.log('Processing students:', studentsData.length);
        
        for (const student of studentsData) {
          const studentClasses = student.class_rosters?.map(cr => cr.classes?.class_name).filter(Boolean) || [];

          const hasBus = (student.student_bus_assignments?.length || 0) > 0;
          const hasWalker = (student.student_walker_assignments?.length || 0) > 0;
          const hasCar = (student.student_car_assignments?.length || 0) > 0;
          const hasAfterSchool = (student.student_after_school_assignments?.length || 0) > 0;
          const transportation = hasBus ? 'Bus' : hasWalker ? 'Walker' : hasCar ? 'Car Rider' : hasAfterSchool ? 'After School Activities' : undefined;
          
          console.log(`Processing student: ${student.first_name} ${student.last_name}`, {
            id: student.id,
            grade: student.grade_level,
            classes: studentClasses,
            transportation,
          });
          
          allPeople.push({
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            studentId: student.student_id,
            role: 'Student',
            grade: student.grade_level,
            classes: studentClasses,
            transportation,
          });
        }
      }

      console.log('Fetched people data:', allPeople);
      setPeople(allPeople);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({
        title: "Error",
        description: "Failed to load people data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      // Refresh the people list
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profile?.school_id) {
        await fetchPeople(profile.school_id);
      }
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

  // Get unique grades for filter dropdown
  const uniqueGrades = [...new Set(people.filter(p => p.grade).map(p => p.grade!))].sort();
  
  // Get unique classes for filter dropdown (filtered by grade if selected)
  const uniqueClasses = [...new Set(
    people
      .filter(p => filterGrade === 'all' || p.grade === filterGrade)
      .flatMap(p => p.classes)
      .filter(Boolean)
  )].sort();

  // Get unique transportation methods for filter dropdown
  const uniqueTransportation = [...new Set(people.filter(p => p.transportation).map(p => p.transportation!))].sort();

  // Apply filters and sorting
  const filteredAndSortedPeople = people
    .filter(person => {
      if (userRole === 'teacher') {
        const inMyClasses = person.classes?.some((c) => teacherClasses.includes(c));
        if (person.role === 'Student') return inMyClasses;
        if (person.role === 'Teacher') {
          const isMe = person.email && user?.email && person.email === user.email;
          return isMe || inMyClasses;
        }
        return false;
      }
      if (filterRole !== 'all' && person.role !== filterRole) return false;
      if (filterGrade !== 'all' && person.grade !== filterGrade) return false;
      if (filterClass !== 'all' && !person.classes.includes(filterClass)) return false;
      if (filterTransportation !== 'all' && person.transportation !== filterTransportation) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'grade':
          aValue = a.grade?.toLowerCase() || '';
          bValue = b.grade?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
     });

  // Debug logs
  console.log('Debug - All people:', people.length);
  console.log('Debug - Students:', people.filter(p => p.role === 'Student').length);
  console.log('Debug - People with transportation:', people.filter(p => p.transportation).length);
  console.log('Debug - uniqueTransportation:', uniqueTransportation);
  console.log('Debug - filteredAndSortedPeople:', filteredAndSortedPeople.length);

  // Reset page when filters change
  const handleFilterChange = (newFilterRole?: typeof filterRole, newFilterGrade?: string, newFilterClass?: string, newFilterTransportation?: typeof filterTransportation) => {
    setCurrentPage(1);
    if (newFilterRole !== undefined) setFilterRole(newFilterRole);
    if (newFilterGrade !== undefined) {
      setFilterGrade(newFilterGrade);
      // Reset class filter when grade changes
      if (newFilterGrade !== filterGrade) {
        setFilterClass('all');
      }
    }
    if (newFilterClass !== undefined) setFilterClass(newFilterClass);
    if (newFilterTransportation !== undefined) setFilterTransportation(newFilterTransportation);
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder?: typeof sortOrder) => {
    setCurrentPage(1);
    setSortBy(newSortBy);
    if (newSortOrder) setSortOrder(newSortOrder);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedPeople.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPeople = filteredAndSortedPeople.slice(startIndex, endIndex);

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
  if (userRole === 'school_admin') {
    return (
      <>
        <SEO />
        <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold">
                {schoolName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {firstName} {lastName}
              </p>
            </div>
          </div>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </header>

        <main className="flex-1 p-6 space-y-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        People Management
                      </CardTitle>
                      <CardDescription>
                        Manage students, teachers, and administrators
                      </CardDescription>
                    </div>
                     {schoolId && (
                      <AddPersonDialog 
                        schoolId={schoolId} 
                        onPersonAdded={() => {
                          console.log('Person added, refreshing data...');
                          if (schoolId) {
                            fetchPeople(schoolId);
                          }
                        }} 
                      />
                     )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters and Sort Controls */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>
                    
                    {/* Role Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
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
                        <Button variant="outline" size="sm" className="h-8">
                          Grade: {filterGrade === 'all' ? 'All' : filterGrade}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, 'all')}>
                          All Grades
                        </DropdownMenuItem>
                        {uniqueGrades.map((grade) => (
                          <DropdownMenuItem key={grade} onClick={() => handleFilterChange(undefined, grade)}>
                            {grade}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Class Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          Class: {filterClass === 'all' ? 'All' : filterClass}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, undefined, 'all')}>
                          All Classes
                        </DropdownMenuItem>
                        {uniqueClasses.map((className) => (
                          <DropdownMenuItem key={className} onClick={() => handleFilterChange(undefined, undefined, className)}>
                            {className}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Transportation Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          Transportation: {filterTransportation === 'all' ? 'All' : filterTransportation}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, undefined, undefined, 'all')}>
                          All Transportation
                        </DropdownMenuItem>
                        {uniqueTransportation.map((transportationType) => (
                          <DropdownMenuItem key={transportationType} onClick={() => handleFilterChange(undefined, undefined, undefined, transportationType)}>
                            {transportationType}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-4 w-px bg-border mx-2" />

                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Sort:</span>
                    </div>

                    {/* Sort Options */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          {sortBy === 'name' ? 'Name' : sortBy === 'role' ? 'Role' : 'Grade'} ({sortOrder === 'asc' ? '↑' : '↓'})
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleSortChange('name', 'asc')}>
                          Name (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('name', 'desc')}>
                          Name (Z-A)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('role', 'asc')}>
                          Role (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('role', 'desc')}>
                          Role (Z-A)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('grade', 'asc')}>
                          Grade (A-Z)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('grade', 'desc')}>
                          Grade (Z-A)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex-1" />
                    
                    {/* Results count */}
                    <div className="text-sm text-muted-foreground">
                      {filteredAndSortedPeople.length} of {people.length} people
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Transportation</TableHead>
                        <TableHead>Classes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPeople.map((person) => (
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
                          <TableCell>{person.transportation || '-'}</TableCell>
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

                  {people.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No people found. Import a roster to get started.
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {people.length > 0 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedPeople.length)} of {filteredAndSortedPeople.length} people
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
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
                          Next
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
              if (schoolId) {
                fetchPeople(schoolId);
              }
            }}
          />
        )}
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
                {schoolName}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {firstName} {lastName}
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                People Management
              </CardTitle>
              <CardDescription>
                View students, teachers, and administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Sort Controls */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
                {userRole !== 'teacher' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>
                    
                    {/* Role Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
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
                        <Button variant="outline" size="sm" className="h-8">
                          Grade: {filterGrade === 'all' ? 'All' : filterGrade}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, 'all')}>
                          All Grades
                        </DropdownMenuItem>
                        {uniqueGrades.map((grade) => (
                          <DropdownMenuItem key={grade} onClick={() => handleFilterChange(undefined, grade)}>
                            {grade}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Class Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          Class: {filterClass === 'all' ? 'All' : filterClass}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange(undefined, undefined, 'all')}>
                          All Classes
                        </DropdownMenuItem>
                        {uniqueClasses.map((className) => (
                          <DropdownMenuItem key={className} onClick={() => handleFilterChange(undefined, undefined, className)}>
                            {className}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-4 w-px bg-border mx-2" />
                  </>
                )}

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sort:</span>
                </div>

                {/* Sort Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      {sortBy === 'name' ? 'Name' : sortBy === 'role' ? 'Role' : 'Grade'} ({sortOrder === 'asc' ? '↑' : '↓'})
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => handleSortChange('name', 'asc')}>
                      Name (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('name', 'desc')}>
                      Name (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('role', 'asc')}>
                      Role (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('role', 'desc')}>
                      Role (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('grade', 'asc')}>
                      Grade (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('grade', 'desc')}>
                      Grade (Z-A)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex-1" />
                
                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  {filteredAndSortedPeople.length} of {people.length} people
                </div>
              </div>

              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Transportation</TableHead>
                      <TableHead>Classes</TableHead>
                      {userRole === 'school_admin' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {currentPeople.map((person) => (
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
                      <TableCell>{person.transportation || '-'}</TableCell>
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

              {people.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No people found.
                </div>
              )}

              {/* Pagination Controls */}
              {people.length > 0 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedPeople.length)} of {filteredAndSortedPeople.length} people
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
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
                      Next
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
          <EditPersonDialog
            person={personToEdit}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            schoolId={schoolId}
            onPersonUpdated={() => {
              console.log('Person updated, refreshing data...');
              if (schoolId) {
                fetchPeople(schoolId);
              }
            }}
          />
        )}
      </div>
      </div>
    </>
  );
};

export default People;