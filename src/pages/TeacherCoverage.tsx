import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssignClassCoverageDialog } from "@/components/AssignClassCoverageDialog";
import { CoverageDashboardWidget } from "@/components/CoverageDashboardWidget";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TeacherInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ClassInfo = {
  class_id: string;
  class_name: string;
  grade_level: string;
};

type CoverageAssignment = {
  id: string;
  class_id: string;
  class_name: string;
  covering_teacher_name: string;
  coverage_date: string;
  notes?: string;
  assigned_by_name?: string;
};

export default function TeacherCoverage() {
  const { user, userRole, signOut } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses();
  const [availableTeachers, setAvailableTeachers] = useState<TeacherInfo[]>([]);
  const [myAssignments, setMyAssignments] = useState<CoverageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  
  // School admin specific state
  const [allSchoolClasses, setAllSchoolClasses] = useState<ClassInfo[]>([]);
  const [selectedClassForCoverage, setSelectedClassForCoverage] = useState<string>("");
  const [allSchoolAssignments, setAllSchoolAssignments] = useState<CoverageAssignment[]>([]);

  useEffect(() => {
    if (user) {
      fetchAvailableTeachers();
      
      if (userRole === 'school_admin') {
        fetchAllSchoolClasses();
        fetchAllSchoolAssignments();
      } else {
        fetchMyAssignments();
      }
    }
  }, [user, userRole]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id, first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name || "");
          setLastName(profile.last_name || "");

          if (profile.school_id) {
            const { data: school } = await supabase
              .from("schools")
              .select("school_name")
              .eq("id", profile.school_id)
              .single();

            if (school) {
              setSchoolName(school.school_name || "");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, [user]);

  const fetchAvailableTeachers = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) return;

      const { data: teachers, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          user_roles!inner(role)
        `)
        .eq("school_id", profile.school_id)
        .eq("user_roles.role", "teacher")
        .neq("id", user.id);

      if (error) throw error;

      const teacherList: TeacherInfo[] = teachers.map((t) => ({
        id: t.id,
        first_name: t.first_name || '',
        last_name: t.last_name || '',
        email: t.email || "",
      }));

      setAvailableTeachers(teacherList);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    }
  };

  const fetchMyAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("class_coverage")
        .select(`
          id,
          class_id,
          coverage_date,
          notes,
          classes!inner(class_name),
          profiles!class_coverage_covering_teacher_id_fkey(first_name, last_name)
        `)
        .eq("assigned_by", user.id)
        .gte("coverage_date", today)
        .order("coverage_date", { ascending: true });

      if (error) throw error;

      const assignments: CoverageAssignment[] = data.map((item: any) => ({
        id: item.id,
        class_id: item.class_id,
        class_name: item.classes.class_name,
        covering_teacher_name: `${item.profiles.first_name} ${item.profiles.last_name}`,
        coverage_date: item.coverage_date,
        notes: item.notes,
      }));

      setMyAssignments(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load coverage assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchoolClasses = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) return;

      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name, grade_level")
        .eq("school_id", profile.school_id)
        .order("class_name");

      if (error) throw error;

      const classList: ClassInfo[] = data.map(c => ({
        class_id: c.id,
        class_name: c.class_name,
        grade_level: c.grade_level || '',
      }));

      setAllSchoolClasses(classList);
    } catch (error) {
      console.error("Error fetching school classes:", error);
      toast.error("Failed to load classes");
    }
  };

  const fetchAllSchoolAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) return;

      const { data, error } = await supabase
        .from("class_coverage")
        .select(`
          id,
          class_id,
          coverage_date,
          notes,
          classes!inner(class_name, school_id),
          profiles!class_coverage_covering_teacher_id_fkey(first_name, last_name),
          assignedBy:profiles!class_coverage_assigned_by_fkey(first_name, last_name)
        `)
        .eq("classes.school_id", profile.school_id)
        .gte("coverage_date", today)
        .order("coverage_date", { ascending: true });

      if (error) throw error;

      const assignments: CoverageAssignment[] = data.map((item: any) => ({
        id: item.id,
        class_id: item.class_id,
        class_name: item.classes.class_name,
        covering_teacher_name: `${item.profiles.first_name} ${item.profiles.last_name}`,
        coverage_date: item.coverage_date,
        notes: item.notes,
        assigned_by_name: `${item.assignedBy.first_name} ${item.assignedBy.last_name}`,
      }));

      setAllSchoolAssignments(assignments);
    } catch (error) {
      console.error("Error fetching school assignments:", error);
      toast.error("Failed to load coverage assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("class_coverage")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Coverage assignment deleted");
      
      if (userRole === 'school_admin') {
        fetchAllSchoolAssignments();
      } else {
        fetchMyAssignments();
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  };

  if (classesLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">
              {schoolName ? `${schoolName} ` : ""}
              {userRole === 'school_admin' ? 'Coverage Management' : 'Class Coverage'}
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
        {/* For Teachers: My Classes */}
        {userRole === 'teacher' && (
          <Card>
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>
                Assign other teachers to cover your classes when you're absent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {classes.length === 0 ? (
                <p className="text-muted-foreground">No classes assigned to you</p>
              ) : (
                classes.map((cls) => (
                  <div
                    key={cls.class_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{cls.class_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Grade {cls.grade_level}
                      </p>
                    </div>
                    <AssignClassCoverageDialog
                      classId={cls.class_id}
                      className={cls.class_name}
                      availableTeachers={availableTeachers}
                      onCoverageAssigned={fetchMyAssignments}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* For School Admins: Assign Coverage with Class Selection */}
        {userRole === 'school_admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Assign Coverage</CardTitle>
              <CardDescription>
                Select a class and assign a teacher to provide coverage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Class</label>
                  <Select value={selectedClassForCoverage} onValueChange={setSelectedClassForCoverage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allSchoolClasses.map((cls) => (
                        <SelectItem key={cls.class_id} value={cls.class_id}>
                          {cls.class_name} {cls.grade_level && `(Grade ${cls.grade_level})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClassForCoverage && (
                  <AssignClassCoverageDialog
                    classId={selectedClassForCoverage}
                    className={allSchoolClasses.find(c => c.class_id === selectedClassForCoverage)?.class_name || ''}
                    availableTeachers={availableTeachers}
                    onCoverageAssigned={() => {
                      fetchAllSchoolAssignments();
                      setSelectedClassForCoverage('');
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Coverage Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === 'school_admin' ? 'All Coverage Assignments' : 'Coverage I\'ve Assigned'}
          </CardTitle>
          <CardDescription>
            {userRole === 'school_admin' 
              ? 'All upcoming coverage assignments for your school'
              : 'Upcoming coverage assignments for your classes'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(userRole === 'school_admin' ? allSchoolAssignments : myAssignments).length === 0 ? (
            <p className="text-muted-foreground">No upcoming coverage assignments</p>
          ) : (
            (userRole === 'school_admin' ? allSchoolAssignments : myAssignments).map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{assignment.class_name}</h3>
                    <span className="text-sm text-muted-foreground">→</span>
                    <span className="text-sm font-medium">
                      {assignment.covering_teacher_name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(assignment.coverage_date), "MMMM d, yyyy")}
                  </p>
                  {userRole === 'school_admin' && assignment.assigned_by_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Assigned by: {assignment.assigned_by_name}
                    </p>
                  )}
                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      {assignment.notes}
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Coverage Assignment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the coverage assignment for {assignment.class_name} on{" "}
                        {format(new Date(assignment.coverage_date), "MMMM d, yyyy")}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </CardContent>
      </Card>

        {/* Coverage I'm Providing - Teachers Only */}
        {userRole === 'teacher' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Coverage I'm Providing</h2>
            <CoverageDashboardWidget />
          </div>
        )}
      </main>
    </>
  );
}
