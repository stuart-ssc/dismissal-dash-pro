import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckSquare, XSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  student_id: string;
};

type ClassInfo = {
  class_id: string;
  class_name: string;
};

type ManageGroupStudentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any | null;
  onSuccess: () => void;
};

export function ManageGroupStudentsDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ManageGroupStudentsDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [studentClassMap, setStudentClassMap] = useState<Map<string, ClassInfo[]>>(new Map());
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);

  useEffect(() => {
    if (open && group) {
      loadStudents();
    } else {
      setSearchQuery("");
      setGradeFilter("all");
      setClassFilter("all");
    }
  }, [open, group]);

  const loadStudents = async () => {
    if (!user || !group) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      const { data: groupData } = await supabase
        .from("special_use_groups")
        .select("academic_session_id")
        .eq("id", group.id)
        .single();

      if (!groupData?.academic_session_id) {
        toast.error("Group has no academic session assigned");
        return;
      }

      const schoolId = profile?.school_id;
      const sessionId = groupData.academic_session_id;

      // Fetch students and class data in parallel
      const [studentsRes, membersRes, rosterRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, first_name, last_name, grade_level, student_id")
          .eq("school_id", schoolId)
          .eq("academic_session_id", sessionId)
          .order("last_name"),
        supabase
          .from("special_use_group_students")
          .select("student_id")
          .eq("group_id", group.id),
        supabase
          .from("class_rosters")
          .select("student_id, class_id, classes(id, class_name)")
          .eq("classes.school_id", schoolId)
          .eq("classes.academic_session_id", sessionId),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (membersRes.error) throw membersRes.error;

      setStudents(studentsRes.data || []);
      setSelectedStudents(new Set(membersRes.data?.map(m => m.student_id) || []));

      // Build student-to-class map and available classes
      const classMap = new Map<string, ClassInfo[]>();
      const classSet = new Map<string, string>();

      (rosterRes.data || []).forEach((r: any) => {
        if (r.classes) {
          const info: ClassInfo = { class_id: r.class_id, class_name: r.classes.class_name };
          if (!classMap.has(r.student_id)) {
            classMap.set(r.student_id, []);
          }
          classMap.get(r.student_id)!.push(info);
          classSet.set(r.class_id, r.classes.class_name);
        }
      });

      setStudentClassMap(classMap);
      setAvailableClasses(
        Array.from(classSet.entries())
          .map(([class_id, class_name]) => ({ class_id, class_name }))
          .sort((a, b) => a.class_name.localeCompare(b.class_name))
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to load students");
    }
  };

  const availableGrades = useMemo(() => {
    const grades = new Set(students.map(s => s.grade_level).filter(Boolean));
    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        searchQuery === "" ||
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.student_id && student.student_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = gradeFilter === "all" || student.grade_level === gradeFilter;

      const matchesClass =
        classFilter === "all" ||
        (studentClassMap.get(student.id) || []).some(c => c.class_id === classFilter);

      return matchesSearch && matchesGrade && matchesClass;
    });
  }, [students, searchQuery, gradeFilter, classFilter, studentClassMap]);

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAllFiltered = () => {
    const newSelected = new Set(selectedStudents);
    filteredStudents.forEach(s => newSelected.add(s.id));
    setSelectedStudents(newSelected);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredStudents.map(s => s.id));
    const newSelected = new Set(selectedStudents);
    filteredIds.forEach(id => newSelected.delete(id));
    setSelectedStudents(newSelected);
  };

  const handleSave = async () => {
    if (!user || !group) return;

    setLoading(true);
    try {
      const { data: currentMembers } = await supabase
        .from("special_use_group_students")
        .select("student_id")
        .eq("group_id", group.id);

      const currentIds = new Set(currentMembers?.map(m => m.student_id) || []);
      const toAdd = Array.from(selectedStudents).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedStudents.has(id));

      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("special_use_group_students")
          .insert(toAdd.map(studentId => ({ group_id: group.id, student_id: studentId, added_by: user.id })));
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("special_use_group_students")
          .delete()
          .eq("group_id", group.id)
          .in("student_id", toRemove);
        if (removeError) throw removeError;
      }

      toast.success("Group roster updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update roster");
    } finally {
      setLoading(false);
    }
  };

  const filteredSelectedCount = filteredStudents.filter(s => selectedStudents.has(s.id)).length;
  const allFilteredSelected = filteredStudents.length > 0 && filteredSelectedCount === filteredStudents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Students</DialogTitle>
          <DialogDescription>
            Add or remove students from {group?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {availableGrades.map(g => (
                  <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map(c => (
                  <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || gradeFilter !== "all" || classFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={() => { setSearchQuery(""); setGradeFilter("all"); setClassFilter("all"); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}

            <Badge variant="secondary" className="ml-auto">{selectedStudents.size} selected</Badge>
          </div>

          {/* Bulk actions */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {!allFilteredSelected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleSelectAllFiltered}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select all {filteredStudents.length}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleDeselectAllFiltered}
                >
                  <XSquare className="h-3.5 w-3.5" />
                  Deselect all {filteredStudents.length}
                </Button>
              )}
            </div>
          )}

          {/* Student list */}
          <div className="border rounded-lg max-h-72 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No students match filters</div>
            ) : (
              filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {student.first_name} {student.last_name} <span className="text-muted-foreground font-normal">(Grade {student.grade_level})</span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
