import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Trash2 } from "lucide-react";

interface ManageClassStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  gradeLevel: string;
  schoolId: number;
  onUpdated?: () => void;
}

interface RosterItem {
  roster_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
}

interface CandidateStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
  grade_level: string;
}

export const ManageClassStudentsDialog = ({ open, onOpenChange, classId, className, gradeLevel, schoolId, onUpdated }: ManageClassStudentsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_rosters')
        .select(`id, student_id, students ( id, first_name, last_name, student_id )`)
        .eq('class_id', classId);

      if (error) throw error;

      const items: RosterItem[] = (data || []).map((row: any) => ({
        roster_id: row.id,
        student_id: row.student_id,
        first_name: row.students?.first_name || '',
        last_name: row.students?.last_name || '',
        student_code: row.students?.student_id || null,
      }));
      // Sort by last name
      items.sort((a, b) => a.last_name.localeCompare(b.last_name));
      setRoster(items);
    } catch (err) {
      console.error('Error fetching roster', err);
      toast({ title: 'Error', description: 'Failed to load class roster', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, grade_level')
        .eq('school_id', schoolId)
        .eq('grade_level', gradeLevel);
      if (error) throw error;

      const currentIds = new Set(roster.map(r => r.student_id));
      const available = (data || []).filter(s => !currentIds.has(s.id));
      available.sort((a, b) => a.last_name.localeCompare(b.last_name));
      setCandidates(available);
    } catch (err) {
      console.error('Error fetching candidates', err);
      toast({ title: 'Error', description: 'Failed to load available students', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchRoster();
  }, [open, classId]);

  useEffect(() => {
    if (!open) return;
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classId, roster.length, schoolId, gradeLevel]);

  const handleAdd = async () => {
    if (!selectedStudentId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('class_rosters')
        .insert({ student_id: selectedStudentId, class_id: classId });
      if (error) throw error;
      toast({ title: 'Student added', description: 'Student added to class successfully.' });
      setSelectedStudentId('');
      await fetchRoster();
      await fetchCandidates();
      onUpdated?.();
    } catch (err) {
      console.error('Error adding student', err);
      toast({ title: 'Error', description: 'Failed to add student', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (rosterId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('class_rosters').delete().eq('id', rosterId);
      if (error) throw error;
      toast({ title: 'Student removed', description: 'Student removed from class.' });
      await fetchRoster();
      await fetchCandidates();
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
            Add or remove students for {className}. Only students in grade {gradeLevel} are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <Label>Current Students</Label>
            <div className="rounded-md border bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : roster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No students in this class yet.</TableCell>
                    </TableRow>
                  ) : (
                    roster.map((r) => (
                      <TableRow key={r.roster_id} className="border-border">
                        <TableCell className="font-medium">{r.last_name}, {r.first_name}</TableCell>
                        <TableCell>{r.student_code || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleRemove(r.roster_id)} disabled={isSubmitting}>
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
                        {s.last_name}, {s.first_name}{s.student_id ? ` · ${s.student_id}` : ''}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageClassStudentsDialog;
