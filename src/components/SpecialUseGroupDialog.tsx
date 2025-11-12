import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type SpecialUseGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any | null;
  onSuccess: () => void;
};

export function SpecialUseGroupDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: SpecialUseGroupDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [academicSessions, setAcademicSessions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    group_type: "other",
    is_active: true,
    academic_session_id: "",
  });

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profile?.school_id) {
        const { data: sessions } = await supabase
          .from("academic_sessions")
          .select("*")
          .eq("school_id", profile.school_id)
          .order("start_date", { ascending: false });

        if (sessions) {
          setAcademicSessions(sessions);
          
          // If creating new group, pre-select active session
          if (!group) {
            const activeSession = sessions.find(s => s.is_active);
            if (activeSession) {
              setFormData(prev => ({
                ...prev,
                academic_session_id: activeSession.id
              }));
            }
          }
        }
      }
    };

    if (open) {
      fetchSessions();
    }

    if (group) {
      setFormData({
        name: group.name || "",
        description: group.description || "",
        group_type: group.group_type || "other",
        is_active: group.is_active ?? true,
        academic_session_id: group.academic_session_id || "",
      });
    } else if (!group && open) {
      setFormData({
        name: "",
        description: "",
        group_type: "other",
        is_active: true,
        academic_session_id: "",
      });
    }
  }, [group, open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Get user's school_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) {
        throw new Error("User school not found");
      }

      if (group) {
        // Update existing group
        const { error } = await supabase
          .from("special_use_groups")
          .update({
            ...formData,
            academic_session_id: formData.academic_session_id,
          })
          .eq("id", group.id);

        if (error) throw error;
        toast.success("Group updated successfully");
      } else {
        // Create new group
        const { error } = await supabase
          .from("special_use_groups")
          .insert({
            ...formData,
            school_id: profile.school_id,
            created_by: user.id,
            academic_session_id: formData.academic_session_id,
          });

        if (error) throw error;
        toast.success("Group created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {group ? "Update group details" : "Create a new special use group"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group_type">Type</Label>
              <Select
                value={formData.group_type}
                onValueChange={(value) => setFormData({ ...formData, group_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_trip">Field Trip</SelectItem>
                  <SelectItem value="athletics">Athletics</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="academic_session">Academic Session</Label>
              <Select
                value={formData.academic_session_id}
                onValueChange={(value) => setFormData({ ...formData, academic_session_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.session_name}
                      {session.is_active && " (Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
