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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ManageGroupManagersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any | null;
  onSuccess: () => void;
};

export function ManageGroupManagersDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ManageGroupManagersDialogProps) {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && group) {
      loadTeachers();
    }
  }, [open, group]);

  const loadTeachers = async () => {
    if (!user || !group) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      const { data: allTeachers, error: teachersError } = await supabase
        .from("teachers")
        .select("id, first_name, last_name, email")
        .eq("school_id", profile?.school_id)
        .order("last_name");

      if (teachersError) throw teachersError;

      const { data: currentManagers, error: managersError } = await supabase
        .from("special_use_group_managers")
        .select("manager_id")
        .eq("group_id", group.id);

      if (managersError) throw managersError;

      setTeachers(allTeachers || []);
      setSelectedManagers(new Set(currentManagers?.map(m => m.manager_id) || []));
    } catch (error: any) {
      toast.error(error.message || "Failed to load teachers");
    }
  };

  const handleToggleManager = (teacherId: string) => {
    const newSelected = new Set(selectedManagers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedManagers(newSelected);
  };

  const handleSave = async () => {
    if (!user || !group) return;

    setLoading(true);
    try {
      const { data: currentManagers } = await supabase
        .from("special_use_group_managers")
        .select("manager_id")
        .eq("group_id", group.id);

      const currentIds = new Set(currentManagers?.map(m => m.manager_id) || []);
      const toAdd = Array.from(selectedManagers).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedManagers.has(id));

      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("special_use_group_managers")
          .insert(
            toAdd.map(managerId => ({
              group_id: group.id,
              manager_id: managerId,
              assigned_by: user.id,
            }))
          );

        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("special_use_group_managers")
          .delete()
          .eq("group_id", group.id)
          .in("manager_id", toRemove);

        if (removeError) throw removeError;
      }

      toast.success("Managers updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update managers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Managers</DialogTitle>
          <DialogDescription>
            Assign teachers to manage {group?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{selectedManagers.size} selected</Badge>
          </div>
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent cursor-pointer"
                onClick={() => handleToggleManager(teacher.id)}
              >
                <Checkbox
                  checked={selectedManagers.has(teacher.id)}
                  onCheckedChange={() => handleToggleManager(teacher.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {teacher.first_name} {teacher.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{teacher.email}</div>
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
