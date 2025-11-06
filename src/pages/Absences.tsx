import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserX, Calendar as CalendarIcon, Search, Loader2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
};

type Absence = {
  id: string;
  student_id: string;
  absence_type: 'single_date' | 'date_range';
  start_date: string;
  end_date: string | null;
  reason: string | null;
  notes: string | null;
  returned_at: string | null;
  returned_by: string | null;
  created_at: string;
  student?: Student;
};

export default function Absences() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  
  // Form state
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Absences list state
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(true);
  const [absenceFilter, setAbsenceFilter] = useState<'today' | 'week' | 'all'>('today');
  const [absenceSearch, setAbsenceSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch school ID
  useEffect(() => {
    const fetchSchoolId = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
      }
    };
    
    fetchSchoolId();
  }, [user]);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) return;
      
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level')
        .eq('school_id', schoolId)
        .order('last_name')
        .order('first_name');
      
      setStudents(data || []);
    };
    
    fetchStudents();
  }, [schoolId]);

  // Fetch absences
  const fetchAbsences = async () => {
    if (!schoolId) return;
    
    setLoadingAbsences(true);
    try {
      let query = supabase
        .from('student_absences')
        .select('*, students!inner(first_name, last_name, grade_level)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      // Apply date filter
      const today = new Date().toISOString().split('T')[0];
      if (absenceFilter === 'today') {
        query = query.or(`and(absence_type.eq.single_date,start_date.eq.${today}),and(absence_type.eq.date_range,start_date.lte.${today},end_date.gte.${today})`);
      } else if (absenceFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        query = query.gte('start_date', weekAgoStr);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching absences:', error);
        toast.error('Failed to load absences');
      } else {
        const formattedData = (data || []).map(absence => ({
          ...absence,
          absence_type: absence.absence_type as 'single_date' | 'date_range',
          student: absence.students as Student
        }));
        setAbsences(formattedData);
      }
    } finally {
      setLoadingAbsences(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, [schoolId, absenceFilter]);

  // Real-time subscription
  useEffect(() => {
    if (!schoolId) return;

    const channel = supabase
      .channel('absences_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_absences',
          filter: `school_id=eq.${schoolId}`
        },
        () => {
          fetchAbsences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, absenceFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !dateRange?.from || !user || !schoolId) {
      toast.error('Please select a student and at least one date');
      return;
    }

    setSubmitting(true);
    try {
      const isSingleDate = !dateRange.to || dateRange.from.getTime() === dateRange.to.getTime();
      
      const { error } = await supabase
        .from('student_absences')
        .insert({
          student_id: selectedStudent.id,
          school_id: schoolId,
          absence_type: isSingleDate ? 'single_date' : 'date_range',
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: isSingleDate ? null : format(dateRange.to!, 'yyyy-MM-dd'),
          reason: reason.trim() || null,
          notes: null,
          marked_by: user.id
        });

      if (error) throw error;

      const dateStr = isSingleDate
        ? format(dateRange.from, 'MMM d, yyyy')
        : `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to!, 'MMM d, yyyy')}`;
      
      toast.success(`${selectedStudent.first_name} ${selectedStudent.last_name} marked absent for ${dateStr}`);
      
      // Reset form
      setSelectedStudent(null);
      setSearchTerm("");
      setDateRange({ from: new Date(), to: new Date() });
      setReason("");
    } catch (error) {
      console.error('Error marking student absent:', error);
      toast.error('Failed to mark student absent');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark student as returned
  const handleMarkReturned = async (absenceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('student_absences')
        .update({
          returned_at: new Date().toISOString(),
          returned_by: user.id
        })
        .eq('id', absenceId);

      if (error) throw error;

      toast.success('Student marked as returned to school');
    } catch (error) {
      console.error('Error marking student returned:', error);
      toast.error('Failed to mark student as returned');
    }
  };

  // Delete absence
  const handleDelete = async () => {
    if (!absenceToDelete) return;

    try {
      const { error } = await supabase
        .from('student_absences')
        .delete()
        .eq('id', absenceToDelete);

      if (error) throw error;

      toast.success('Absence record deleted');
      setDeleteDialogOpen(false);
      setAbsenceToDelete(null);
    } catch (error) {
      console.error('Error deleting absence:', error);
      toast.error('Failed to delete absence record');
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Filter absences based on search
  const filteredAbsences = absences.filter(absence => {
    if (!absenceSearch) return true;
    const studentName = `${absence.student?.first_name} ${absence.student?.last_name}`.toLowerCase();
    return studentName.includes(absenceSearch.toLowerCase());
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO />
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">Student Absences</h1>
            <p className="text-sm text-muted-foreground">
              Mark students absent for dismissal
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Mark Student Absent Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-primary" />
              <CardTitle>Mark Student Absent</CardTitle>
            </div>
            <CardDescription>
              Students marked absent won't appear in any dismissal modes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Search */}
              <div className="space-y-2">
                <Label htmlFor="student-search">Select Student</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="student-search"
                    placeholder="Search by student name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchTerm && filteredStudents.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {filteredStudents.slice(0, 10).map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(student);
                          setSearchTerm(`${student.first_name} ${student.last_name}`);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                      >
                        <div className="font-medium">{student.first_name} {student.last_name}</div>
                        <div className="text-sm text-muted-foreground">Grade {student.grade_level}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedStudent && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                    <span className="text-sm font-medium">
                      Selected: {selectedStudent.first_name} {selectedStudent.last_name} (Grade {selectedStudent.grade_level})
                    </span>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Absence Dates</Label>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                  >
                    Just Today
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click a date for single day, or select two dates for a range
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                          <>
                            {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        <span>Pick absence date(s)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                      className={cn("pointer-events-auto")}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Sick, Doctor's appointment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={!selectedStudent || submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Marking Absent...
                  </>
                ) : (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Mark Student Absent
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Absences Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle>Current Absences</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={absenceFilter} onValueChange={(value: any) => setAbsenceFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardDescription>
              Manage student absence records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search absences by student name..."
                  value={absenceSearch}
                  onChange={(e) => setAbsenceSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Absences Table */}
              {loadingAbsences ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredAbsences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {absenceSearch ? 'No absences found matching your search.' : 'No students marked absent. All students will participate in dismissal.'}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAbsences.map((absence) => (
                        <TableRow key={absence.id}>
                          <TableCell className="font-medium">
                            {absence.student?.first_name} {absence.student?.last_name}
                          </TableCell>
                          <TableCell>Grade {absence.student?.grade_level}</TableCell>
                          <TableCell>
                            {absence.absence_type === 'single_date' 
                              ? format(new Date(absence.start_date), 'MMM d, yyyy')
                              : `${format(new Date(absence.start_date), 'MMM d')} - ${format(new Date(absence.end_date!), 'MMM d, yyyy')}`
                            }
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {absence.reason || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {absence.returned_at ? (
                              <Badge variant="default" className="bg-secondary">Returned</Badge>
                            ) : (
                              <Badge variant="destructive">Absent</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {!absence.returned_at && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkReturned(absence.id)}
                              >
                                Mark Returned
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAbsenceToDelete(absence.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Absence Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this absence record. The student will immediately appear in dismissal modes if they're scheduled for today.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
