import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, GraduationCap, UserCheck, User, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'School Admin' | 'Teacher' | 'Student';
  grade?: string;
  classes: string[];
  studentId?: string;
}

const People = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [people, setPeople] = useState<PersonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<PersonData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
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

            // Fetch all people associated with the school
            await fetchPeople(profile.school_id);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  const fetchPeople = async (schoolId: number) => {
    setIsLoading(true);
    try {
      const allPeople: PersonData[] = [];

      // Fetch profiles first
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId);

      // Fetch user roles separately to avoid recursion
      const profileIds = profilesData?.map(p => p.id) || [];
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profileIds);

      // Process profiles with roles
      if (profilesData && userRoles) {
        for (const profile of profilesData) {
          const userRole = userRoles.find(ur => ur.user_id === profile.id);
          if (userRole && (userRole.role === 'school_admin' || userRole.role === 'teacher')) {
            allPeople.push({
              id: profile.id,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              email: profile.email || '',
              role: userRole.role === 'school_admin' ? 'School Admin' : 'Teacher',
              classes: [],
            });
          }
        }
      }

      // Fetch teachers separately
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId);

      // Fetch class assignments for teachers separately
      const teacherIds = teachersData?.map(t => t.id) || [];
      const { data: classTeachers } = await supabase
        .from('class_teachers')
        .select('teacher_id, classes(class_name)')
        .in('teacher_id', teacherIds);

      if (teachersData) {
        for (const teacher of teachersData) {
          // Check if this teacher is already in the list (from profiles)
          const existingTeacher = allPeople.find(p => p.email === teacher.email);
          const teacherClasses = classTeachers?.filter(ct => ct.teacher_id === teacher.id)
            .map(ct => ct.classes?.class_name).filter(Boolean) || [];
          
          if (!existingTeacher) {
            allPeople.push({
              id: teacher.id,
              firstName: teacher.first_name,
              lastName: teacher.last_name,
              email: teacher.email,
              role: 'Teacher',
              classes: teacherClasses,
            });
          } else {
            // Update classes for existing teacher
            existingTeacher.classes = teacherClasses;
          }
        }
      }

      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, grade_level')
        .eq('school_id', schoolId);

      // Fetch class assignments for students separately
      const studentIds = studentsData?.map(s => s.id) || [];
      const { data: classRosters } = await supabase
        .from('class_rosters')
        .select('student_id, classes(class_name)')
        .in('student_id', studentIds);

      if (studentsData) {
        for (const student of studentsData) {
          const studentClasses = classRosters?.filter(cr => cr.student_id === student.id)
            .map(cr => cr.classes?.class_name).filter(Boolean) || [];
          
          allPeople.push({
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            studentId: student.student_id,
            role: 'Student',
            grade: student.grade_level,
            classes: studentClasses,
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

  // Pagination logic
  const totalPages = Math.ceil(people.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPeople = people.slice(startIndex, endIndex);

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
      <SidebarProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
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
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add Person
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Grade</TableHead>
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
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(person)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                        Showing {startIndex + 1} to {Math.min(endIndex, people.length)} of {people.length} people
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
          </div>
        </div>

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
      </SidebarProvider>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Classes</TableHead>
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
                    Showing {startIndex + 1} to {Math.min(endIndex, people.length)} of {people.length} people
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
      </div>
    </div>
  );
};

export default People;