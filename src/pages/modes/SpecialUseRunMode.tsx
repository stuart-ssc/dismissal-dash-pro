import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { format } from "date-fns";

type Student = {
  student_id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  student_number: string;
  outbound_checked: boolean;
  return_checked: boolean;
  left_with_parent: boolean;
  parent_name: string | null;
};

type Bus = {
  id: string;
  bus_number: string;
};

export default function SpecialUseRunMode() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBus, setSelectedBus] = useState<string>("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [parentName, setParentName] = useState("");

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["special-use-run", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_use_runs")
        .select(`
          *,
          group:special_use_groups(name),
          buses:special_use_run_buses(
            bus:buses(id, bus_number)
          )
        `)
        .eq("id", runId)
        .single();

      if (error) throw error;
      return {
        ...data,
        buses: data.buses.map((b: any) => b.bus)
      };
    },
    enabled: !!runId,
  });

  const { data: students = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["special-use-run-students", runId, selectedBus],
    queryFn: async () => {
      if (!selectedBus) return [];
      
      const { data, error } = await supabase
        .rpc("get_special_use_run_students", {
          p_run_id: runId,
          p_bus_id: selectedBus
        });

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!runId && !!selectedBus,
  });

  useEffect(() => {
    if (run?.buses && run.buses.length > 0 && !selectedBus) {
      setSelectedBus(run.buses[0].id);
    }
  }, [run, selectedBus]);

  const startOutboundMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("special_use_runs")
        .update({
          status: "outbound_active",
          outbound_started_at: new Date().toISOString(),
          outbound_started_by: user?.id,
        })
        .eq("id", runId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Outbound leg started");
      queryClient.invalidateQueries({ queryKey: ["special-use-run", runId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start outbound leg");
    },
  });

  const completeOutboundMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("special_use_runs")
        .update({
          status: "at_destination",
          outbound_completed_at: new Date().toISOString(),
          outbound_completed_by: user?.id,
        })
        .eq("id", runId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Outbound leg completed");
      queryClient.invalidateQueries({ queryKey: ["special-use-run", runId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete outbound leg");
    },
  });

  const startReturnMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("special_use_runs")
        .update({
          status: "return_active",
          return_started_at: new Date().toISOString(),
          return_started_by: user?.id,
        })
        .eq("id", runId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Return leg started");
      queryClient.invalidateQueries({ queryKey: ["special-use-run", runId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start return leg");
    },
  });

  const completeReturnMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("special_use_runs")
        .update({
          status: "completed",
          return_completed_at: new Date().toISOString(),
          return_completed_by: user?.id,
        })
        .eq("id", runId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Run completed successfully");
      navigate("/admin/special-use-runs");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete run");
    },
  });

  const toggleStudentCheckin = useMutation({
    mutationFn: async ({ studentId, eventType }: { studentId: string; eventType: string }) => {
      if (!user || !selectedBus) return;

      // Check if already checked in
      const { data: existing } = await supabase
        .from("special_use_student_events")
        .select("id")
        .eq("run_id", runId)
        .eq("student_id", studentId)
        .eq("event_type", eventType)
        .maybeSingle();

      if (existing) {
        // Uncheck
        const { error } = await supabase
          .from("special_use_student_events")
          .delete()
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        // Check in
        const { error } = await supabase
          .from("special_use_student_events")
          .insert({
            run_id: runId,
            bus_id: selectedBus,
            student_id: studentId,
            event_type: eventType,
            recorded_by: user.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchStudents();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update check-in");
    },
  });

  const recordLeftWithParent = useMutation({
    mutationFn: async () => {
      if (!user || !selectedStudent || !selectedBus) return;

      const { error } = await supabase
        .from("special_use_student_events")
        .insert({
          run_id: runId,
          bus_id: selectedBus,
          student_id: selectedStudent.student_id,
          event_type: "left_with_parent",
          parent_name: parentName,
          recorded_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student marked as left with parent");
      setParentDialogOpen(false);
      setSelectedStudent(null);
      setParentName("");
      refetchStudents();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record parent pickup");
    },
  });

  if (runLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading run...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Run not found</div>
      </div>
    );
  }

  const isOutbound = run.status === "scheduled" || run.status === "outbound_active";
  const isReturn = run.status === "at_destination" || run.status === "return_active";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/special-use-runs")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{run.run_name}</h1>
              <p className="text-sm text-muted-foreground">
                {run.group.name} • {format(new Date(run.run_date), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <Badge variant={run.status === "completed" ? "secondary" : "default"}>
            {run.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {run.status === "scheduled" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Start Outbound Leg</CardTitle>
              <CardDescription>
                Begin checking students onto buses for departure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => startOutboundMutation.mutate()}>
                <Play className="h-4 w-4 mr-2" />
                Start Outbound
              </Button>
            </CardContent>
          </Card>
        )}

        {run.status === "at_destination" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Start Return Leg</CardTitle>
              <CardDescription>
                Begin checking students for the return trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => startReturnMutation.mutate()}>
                <Play className="h-4 w-4 mr-2" />
                Start Return
              </Button>
            </CardContent>
          </Card>
        )}

        {(run.status === "outbound_active" || run.status === "return_active") && (
          <>
            <div className="flex gap-4 mb-6">
              {run.buses.map((bus: Bus) => (
                <Button
                  key={bus.id}
                  variant={selectedBus === bus.id ? "default" : "outline"}
                  onClick={() => setSelectedBus(bus.id)}
                >
                  Bus {bus.bus_number}
                </Button>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {isOutbound ? "Outbound" : "Return"} Student Checklist
                </CardTitle>
                <CardDescription>
                  Check students as they board the bus
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading students...
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No students assigned to this bus
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => {
                      const isChecked = isOutbound ? student.outbound_checked : student.return_checked;
                      
                      return (
                        <div
                          key={student.student_id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                        >
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => {
                                toggleStudentCheckin.mutate({
                                  studentId: student.student_id,
                                  eventType: isOutbound ? "outbound_checkin" : "return_checkin"
                                });
                              }}
                            />
                            <div>
                              <div className="font-medium">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.student_number} • Grade {student.grade_level}
                              </div>
                            </div>
                          </div>
                          {isReturn && !student.left_with_parent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student);
                                setParentDialogOpen(true);
                              }}
                            >
                              Left with Parent
                            </Button>
                          )}
                          {student.left_with_parent && (
                            <Badge variant="secondary">
                              Left with {student.parent_name}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setCompleteDialogOpen(true)}
                    disabled={students.length === 0}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete {isOutbound ? "Outbound" : "Return"} Leg
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Complete {isOutbound ? "Outbound" : "Return"} Leg
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this leg as complete? This will move the run to the next phase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (isOutbound) {
                  completeOutboundMutation.mutate();
                } else {
                  completeReturnMutation.mutate();
                }
                setCompleteDialogOpen(false);
              }}
            >
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Left with Parent</DialogTitle>
            <DialogDescription>
              Record who picked up {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="parent_name">Parent/Guardian Name</Label>
            <Input
              id="parent_name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Enter parent or guardian name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordLeftWithParent.mutate()}
              disabled={!parentName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
