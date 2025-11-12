import { useState, useEffect } from "react";
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
import { Search, X } from "lucide-react";
import { toast } from "sonner";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  student_id: string;
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

  useEffect(() => {
    if (open && group) {
      loadStudents();
    }
  }, [open, group]);

  const loadStudents = async () => {
    if (!user || !group) return;

    try {
      // Get school students
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      // Get group's academic session
      const { data: groupData } = await supabase
        .from("special_use_groups")
        .select("academic_session_id")
        .eq("id", group.id)
        .single();

      if (!groupData?.academic_session_id) {
        toast.error("Group has no academic session assigned");
        return;
      }

      // Filter students by the group's academic session
      const { data: allStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade_level, student_id")
        .eq("school_id", profile?.school_id)
        .eq("academic_session_id", groupData.academic_session_id)
        .order("last_name");

      if (studentsError) throw studentsError;

      // Get current group members
      const { data: groupMembers, error: membersError } = await supabase
        .from("special_use_group_students")
        .select("student_id")
        .eq("group_id", group.id);

      if (membersError) throw membersError;

      setStudents(allStudents || []);
      setSelectedStudents(new Set(groupMembers?.map(m => m.student_id) || []));
    } catch (error: any) {
      toast.error(error.message || "Failed to load students");
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSave = async () => {
    if (!user || !group) return;

    setLoading(true);
    try {
      // Get current members
      const { data: currentMembers } = await supabase
        .from("special_use_group_students")
        .select("student_id")
        .eq("group_id", group.id);

      const currentIds = new Set(currentMembers?.map(m => m.student_id) || []);
      
      // Find additions and removals
      const toAdd = Array.from(selectedStudents).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedStudents.has(id));

      // Add new students
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("special_use_group_students")
          .insert(
            toAdd.map(studentId => ({
              group_id: group.id,
              student_id: studentId,
              added_by: user.id,
            }))
          );

        if (addError) throw addError;
      }

      // Remove students
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

  const filteredStudents = students.filter((student) =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Students</DialogTitle>
          <DialogDescription>
            Add or remove students from {group?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">{selectedStudents.size} selected</Badge>
          </div>
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent cursor-pointer"
                onClick={() => handleToggleStudent(student.id)}
              >
                <Checkbox
                  checked={selectedStudents.has(student.id)}
                  onCheckedChange={() => handleToggleStudent(student.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {student.student_id} • Grade {student.grade_level}
                  </div>
                </div>
              </div>
            ))}
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
