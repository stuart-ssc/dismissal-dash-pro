import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
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
  const [selectedStudentLabel, setSelectedStudentLabel] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rosterIds = useMemo(() => new Set(roster.map(r => r.student_id)), [roster]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  const fetchRoster = async (): Promise<RosterItem[]> => {
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
      return items;
    } catch (err) {
      console.error('Error fetching roster', err);
      toast({ title: 'Error', description: 'Failed to load class roster', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchResults = async (query: string) => {
    try {
      if (!query || query.length < 2) {
        setCandidates([]);
        setAssignedIds(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id, grade_level')
        .eq('school_id', schoolId)
        .eq('grade_level', gradeLevel)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%`)
        .order('last_name', { ascending: true })
        .limit(25);
      if (error) throw error;

      const results = data || [];
      setCandidates(results);

      const ids = results.map((s) => s.id);
      if (ids.length > 0) {
        const { data: rosterRows, error: rosterErr } = await supabase
          .from('class_rosters')
          .select('student_id')
          .in('student_id', ids);
        if (rosterErr) throw rosterErr;
        setAssignedIds(new Set((rosterRows || []).map((r: any) => r.student_id)));
      } else {
        setAssignedIds(new Set());
      }
    } catch (err) {
      console.error('Error searching students', err);
      toast({ title: 'Error', description: 'Failed to search students', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchRoster();
    setSelectedStudentId('');
    setSelectedStudentLabel('');
    setCandidates([]);
    setAssignedIds(new Set());
    setSearchTerm('');
  }, [open, classId]);

  useEffect(() => {
    if (!open) return;
    const q = searchTerm.trim();
    const handle = setTimeout(() => {
      fetchSearchResults(q);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm, open, schoolId, gradeLevel]);

  const handleAdd = async () => {
    if (!selectedStudentId) return;
    setIsSubmitting(true);
    const addedId = selectedStudentId;
    try {
      const { error } = await supabase
        .from('class_rosters')
        .insert({ student_id: addedId, class_id: classId });
      if (error) throw error;
      toast({ title: 'Student added', description: 'Student added to class successfully.' });
      setSelectedStudentId('');
      setSelectedStudentLabel('');
      await fetchRoster();
      setAssignedIds((prev) => {
        const next = new Set(prev);
        next.add(addedId);
        return next;
      });
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
    const removed = roster.find((r) => r.roster_id === rosterId);
    try {
      const { error } = await supabase.from('class_rosters').delete().eq('id', rosterId);
      if (error) throw error;
      toast({ title: 'Student removed', description: 'Student removed from class.' });
      await fetchRoster();
      if (removed) {
        setAssignedIds((prev) => {
          const next = new Set(prev);
          next.delete(removed.student_id);
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
            Add or remove students for {className}. Only students in grade {gradeLevel} are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <Label>Add Student</Label>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={searchOpen} className="w-full justify-between">
                      {selectedStudentLabel || "Search students by name or ID"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[480px] z-50">
                    <Command>
                      <CommandInput placeholder="Type a name or student ID..." value={searchTerm} onValueChange={setSearchTerm} />
                      <CommandEmpty>No students found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup heading="Students">
                          {candidates.map((s) => {
                            const label = `${s.last_name}, ${s.first_name}${s.student_id ? ` · ${s.student_id}` : ""}`;
                            const inThisClass = rosterIds.has(s.id);
                            const assignedElsewhere = assignedIds.has(s.id) && !inThisClass;
                            return (
                              <CommandItem
                                key={s.id}
                                value={label}
                                onSelect={() => {
                                  setSelectedStudentId(s.id);
                                  setSelectedStudentLabel(label);
                                  setSearchOpen(false);
                                }}
                              >
                                <span>{label}</span>
                                <div className="ml-auto flex items-center gap-2">
                                  {inThisClass ? (
                                    <Badge variant="secondary">In this class</Badge>
                                  ) : assignedElsewhere ? (
                                    <Badge variant="outline">Assigned</Badge>
                                  ) : null}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleAdd} disabled={!selectedStudentId || isSubmitting || rosterIds.has(selectedStudentId)}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageClassStudentsDialog;
