import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, CheckCircle2, Circle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

type AcademicSession = {
  id: string;
  session_name: string;
  session_code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  session_type: string;
  created_at: string;
};

export const AcademicSessionManager = () => {
  const { user } = useAuth();
  const { activeSchoolId } = useMultiSchool();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sessionName: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchSessions();
  }, [activeSchoolId, user]);

  const fetchSessions = async () => {
    if (!activeSchoolId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academic_sessions")
        .select("*")
        .eq("school_id", activeSchoolId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching academic sessions:", error);
      toast.error("Failed to load academic sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!activeSchoolId || !user) return;

    if (!formData.sessionName || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase.from("academic_sessions").insert({
        school_id: activeSchoolId,
        session_name: formData.sessionName,
        session_code: formData.sessionName,
        start_date: formData.startDate,
        end_date: formData.endDate,
        is_active: false,
        session_type: "schoolYear",
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Academic session created successfully");
      setDialogOpen(false);
      setFormData({ sessionName: "", startDate: "", endDate: "" });
      fetchSessions();
    } catch (error: any) {
      console.error("Error creating academic session:", error);
      toast.error("Failed to create academic session");
    }
  };

  const handleToggleActive = async (sessionId: string, currentStatus: boolean) => {
    try {
      // If activating this session, deactivate all others first
      if (!currentStatus) {
        await supabase
          .from("academic_sessions")
          .update({ is_active: false })
          .eq("school_id", activeSchoolId);
      }

      const { error } = await supabase
        .from("academic_sessions")
        .update({ is_active: !currentStatus })
        .eq("id", sessionId);

      if (error) throw error;

      toast.success(
        !currentStatus
          ? "Session activated - now the default for new operations"
          : "Session deactivated"
      );
      fetchSessions();
    } catch (error: any) {
      console.error("Error updating session status:", error);
      toast.error("Failed to update session status");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Academic Sessions</CardTitle>
          <CardDescription>Loading academic sessions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Academic Sessions</CardTitle>
            <CardDescription>
              Manage school years and academic sessions. The active session is used for all new operations.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Academic Session</DialogTitle>
                <DialogDescription>
                  Add a new school year or academic session to track students and classes by year.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionName">Session Name</Label>
                  <Input
                    id="sessionName"
                    placeholder="e.g., 2026-2027"
                    value={formData.sessionName}
                    onChange={(e) =>
                      setFormData({ ...formData, sessionName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession}>Create Session</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No academic sessions found</p>
            <p className="text-sm">Create your first school year session to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {session.is_active ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.session_name}</span>
                      {session.is_active && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.start_date), "MMM d, yyyy")} -{" "}
                      {format(new Date(session.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Button
                  variant={session.is_active ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(session.id, session.is_active)}
                >
                  {session.is_active ? "Deactivate" : "Set Active"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
