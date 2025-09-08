import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Trash2 } from "lucide-react";

interface ManageActivityStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityName: string;
  schoolId: number;
  onUpdated?: () => void;
}

interface AssignmentItem {
  assignment_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
  grade_level: string;
}

interface CandidateStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
  grade_level: string;
}

export const ManageActivityStudentsDialog = ({ 
  open, 
  onOpenChange, 
  activityId, 
  activityName, 
  schoolId, 
  onUpdated 
}: ManageActivityStudentsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async (): Promise<AssignmentItem[]> => {
    setLoading(true);
    try {
      // Fetch activity assignments without nested students query to avoid RLS recursion
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('student_after_school_assignments')
        .select('id, student_id')
        .eq('after_school_activity_id', activityId);

      if (assignmentError) throw assignmentError;

      if (!assignmentData || assignmentData.length === 0) {
        setAssignments([]);
        return [];
      }

      // Fetch student details separately
      const studentIds = assignmentData.map(a => a.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, grade_level')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Combine the data
      const items: AssignmentItem[] = assignmentData.map((assignmentRow) => {
        const student = studentsData?.find(s => s.id === assignmentRow.student_id);
        return {
          assignment_id: assignmentRow.id,
          student_id: assignmentRow.student_id,
          first_name: student?.first_name || '',
          last_name: student?.last_name || '',
          student_code: student?.student_id || null,
          grade_level: student?.grade_level || '',
        };
      });

      // Sort by last name
      items.sort((a, b) => a.last_name.localeCompare(b.last_name));
      setAssignments(items);
      return items;
    } catch (err) {
      console.error('Error fetching activity assignments', err);
      toast({ title: 'Error', description: 'Failed to load activity assignments', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (currentIds?: Set<string>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, grade_level')
        .eq('school_id', schoolId);
      if (error) throw error;

      const ids = currentIds ?? new Set(assignments.map(a => a.student_id));
      const available = (data || []).filter(s => !ids.has(s.id));
      available.sort((a, b) => a.last_name.localeCompare(b.last_name));
      setCandidates(available);
    } catch (err) {
      console.error('Error fetching candidates', err);
      toast({ title: 'Error', description: 'Failed to load available students', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      const items = await fetchAssignments();
      const ids = new Set(items.map(i => i.student_id));
      await fetchCandidates(ids);
    })();
  }, [open, activityId, schoolId]);

  const handleAdd = async () => {
    if (!selectedStudentId) return;
    setIsSubmitting(true);
    const addedId = selectedStudentId;
    try {
      const { error } = await supabase
        .from('student_after_school_assignments')
        .insert({ student_id: addedId, after_school_activity_id: activityId });
      if (error) throw error;
      toast({ title: 'Student added', description: 'Student added to activity successfully.' });
      setSelectedStudentId('');
      await fetchAssignments();
      setCandidates((prev) => prev.filter((s) => s.id !== addedId));
      onUpdated?.();
    } catch (err) {
      console.error('Error adding student', err);
      toast({ title: 'Error', description: 'Failed to add student', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setIsSubmitting(true);
    const removed = assignments.find((a) => a.assignment_id === assignmentId);
    try {
      const { error } = await supabase.from('student_after_school_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Student removed', description: 'Student removed from activity.' });
      await fetchAssignments();
      if (removed) {
        setCandidates((prev) => {
          if (prev.some((s) => s.id === removed.student_id)) return prev;
          const newCandidate: CandidateStudent = {
            id: removed.student_id,
            first_name: removed.first_name,
            last_name: removed.last_name,
            student_id: removed.student_code,
            grade_level: removed.grade_level,
          };
          const next = [...prev, newCandidate];
          next.sort((a, b) => a.last_name.localeCompare(b.last_name));
          return next;
        });
      }
      onUpdated?.();
    } catch (err) {
      console.error('Error removing student', err);
      toast({ title: 'Error', description: 'Failed to remove student', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manage Students</DialogTitle>
          <DialogDescription>
            Add or remove students for {activityName} activity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <Label>Add Student</Label>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1">
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={candidates.length ? 'Select a student' : 'No available students'} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-[240px]">
                    {candidates.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.last_name}, {s.first_name} · {s.grade_level}{s.student_id ? ` · ${s.student_id}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={!selectedStudentId || isSubmitting || candidates.length === 0}>
                <UserPlus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <Label>Current Students</Label>
            <div className="rounded-md border bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No students assigned to this activity yet.</TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.assignment_id} className="border-border">
                        <TableCell className="font-medium">{a.last_name}, {a.first_name}</TableCell>
                        <TableCell>{a.grade_level}</TableCell>
                        <TableCell>{a.student_code || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleRemove(a.assignment_id)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageActivityStudentsDialog;