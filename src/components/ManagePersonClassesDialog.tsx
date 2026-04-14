import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ClassAssignment {
  id: string; // roster or class_teachers row id
  classId: string;
  className: string;
  roomNumber: string | null;
  periodNumber: number | null;
  periodName: string | null;
  periodStartTime: string | null;
  periodEndTime: string | null;
}

interface AvailableClass {
  id: string;
  class_name: string;
  room_number: string | null;
  period_number: number | null;
  period_name: string | null;
  period_start_time: string | null;
  period_end_time: string | null;
}

interface ManagePersonClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  personRole: string; // 'Student' | 'Teacher' | 'School Admin'
  schoolId: number;
  sessionId: string | null;
}

export function ManagePersonClassesDialog({
  open,
  onOpenChange,
  personId,
  personName,
  personRole,
  schoolId,
  sessionId,
}: ManagePersonClassesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");

  const isStudent = personRole === 'Student';
  const tableName = isStudent ? 'class_rosters' : 'class_teachers';
  const foreignKey = isStudent ? 'student_id' : 'teacher_id';

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, personId, schoolId, sessionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from(isStudent ? 'class_rosters' : 'class_teachers')
        .select(`
          id,
          class_id,
          classes!inner (
            id,
            class_name,
            room_number,
            period_number,
            period_name,
            period_start_time,
            period_end_time,
            school_id,
            academic_session_id
          )
        `)
        .eq(isStudent ? 'student_id' : 'teacher_id', personId) as { data: any[] | null; error: any };

      if (assignmentError) throw assignmentError;

      const mapped: ClassAssignment[] = (assignmentData || [])
        .filter((row: any) => {
          const c = row.classes;
          return c.school_id === schoolId && (!sessionId || c.academic_session_id === sessionId);
        })
        .map((row: any) => ({
          id: row.id,
          classId: row.class_id,
          className: row.classes.class_name,
          roomNumber: row.classes.room_number,
          periodNumber: row.classes.period_number,
          periodName: row.classes.period_name,
          periodStartTime: row.classes.period_start_time,
          periodEndTime: row.classes.period_end_time,
        }))
        .sort((a: ClassAssignment, b: ClassAssignment) => {
          if (a.periodNumber === null && b.periodNumber === null) return a.className.localeCompare(b.className);
          if (a.periodNumber === null) return 1;
          if (b.periodNumber === null) return -1;
          return a.periodNumber - b.periodNumber;
        });

      setAssignments(mapped);

      // Fetch available classes
      let classQuery = supabase
        .from('classes')
        .select('id, class_name, room_number, period_number, period_name, period_start_time, period_end_time')
        .eq('school_id', schoolId)
        .eq('is_hidden', false)
        .order('period_number', { ascending: true, nullsFirst: false })
        .order('class_name', { ascending: true });

      if (sessionId) {
        classQuery = classQuery.eq('academic_session_id', sessionId);
      }

      const { data: classData, error: classError } = await classQuery;
      if (classError) throw classError;

      setAvailableClasses(classData || []);
    } catch (error: any) {
      console.error('Error fetching class data:', error);
      toast({
        title: "Error",
        description: "Failed to load class data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedClassId) return;
    setAdding(true);
    try {
      const insertData: any = {
        class_id: selectedClassId,
        [foreignKey]: personId,
      };

      if (isStudent && sessionId) {
        insertData.academic_session_id = sessionId;
      }

      const { error } = await supabase.from(tableName).insert(insertData);
      if (error) {
        if (error.code === '23505') {
          toast({ title: "Already assigned", description: "This person is already in that class." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Class added", description: "Successfully added class assignment." });
        setSelectedClassId("");
        await fetchData();
        queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
      }
    } catch (error: any) {
      console.error('Error adding class:', error);
      toast({ title: "Error", description: "Failed to add class assignment.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setRemovingId(assignmentId);
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', assignmentId);
      if (error) throw error;

      toast({ title: "Class removed", description: "Successfully removed class assignment." });
      await fetchData();
      queryClient.invalidateQueries({ queryKey: ['people-paginated'] });
    } catch (error: any) {
      console.error('Error removing class:', error);
      toast({ title: "Error", description: "Failed to remove class assignment.", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  const assignedClassIds = new Set(assignments.map(a => a.classId));
  const unassignedClasses = availableClasses.filter(c => !assignedClassIds.has(c.id));
  const filteredUnassigned = searchFilter
    ? unassignedClasses.filter(c => c.class_name.toLowerCase().includes(searchFilter.toLowerCase()))
    : unassignedClasses;

  const formatTime = (time: string | null) => {
    if (!time) return null;
    // time is like "08:00:00", format to "8:00 AM"
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Manage Classes
          </DialogTitle>
          <DialogDescription>
            {isStudent ? 'Manage class enrollments' : 'Manage class assignments'} for {personName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Current assignments */}
            <div className="space-y-2 overflow-y-auto max-h-[40vh] pr-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                Current Classes ({assignments.length})
              </h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No classes assigned</p>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{assignment.className}</span>
                        {assignment.roomNumber && (
                          <Badge variant="outline" className="text-xs">
                            Room {assignment.roomNumber}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {assignment.periodNumber !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Period {assignment.periodNumber}
                            {assignment.periodName && ` · ${assignment.periodName}`}
                          </span>
                        )}
                        {assignment.periodStartTime && assignment.periodEndTime && (
                          <span>
                            {formatTime(assignment.periodStartTime)} – {formatTime(assignment.periodEndTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                      onClick={() => handleRemove(assignment.id)}
                      disabled={removingId === assignment.id}
                    >
                      {removingId === assignment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add class section */}
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Add Class
              </h4>
              <div className="flex gap-2">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search classes..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredUnassigned.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        {unassignedClasses.length === 0 ? 'All classes assigned' : 'No matches'}
                      </div>
                    ) : (
                      filteredUnassigned.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          <div className="flex items-center gap-2">
                            <span>{cls.class_name}</span>
                            {cls.period_number !== null && (
                              <span className="text-xs text-muted-foreground">P{cls.period_number}</span>
                            )}
                            {cls.room_number && (
                              <span className="text-xs text-muted-foreground">Rm {cls.room_number}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAdd}
                  disabled={!selectedClassId || adding}
                  size="sm"
                  className="shrink-0"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
