
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import ExitModeButton from "@/components/ExitModeButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, UserCheck, Car } from "lucide-react";
import { toast } from "sonner";

type CarLine = { id: string; line_name: string };
type Student = { id: string; first_name: string; last_name: string; grade_level: string };
type ClassItem = { id: string; class_name: string };
type Session = { id: string; finished_at: string | null };
type PickupStatus = "waiting" | "parent_arrived" | "picked_up";
type StudentPickup = {
  student_id: string;
  status: PickupStatus;
  parent_arrived_at: string | null;
  picked_up_at: string | null;
};

export default function CarLineMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [carLines, setCarLines] = useState<CarLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickups, setPickups] = useState<Record<string, StudentPickup>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const runId = run?.id;

  useEffect(() => {
    const loadLines = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from("car_lines")
        .select("id,line_name")
        .eq("school_id", schoolId)
        .order("line_name", { ascending: true });
      const lines = (data || []) as any;
      setCarLines(lines);
      
      // Auto-select if there's only one car line and none is selected yet
      if (lines.length === 1 && !selectedLine) {
        setSelectedLine(lines[0].id);
        startSession(lines[0].id);
      }
    };
    loadLines();
  }, [schoolId]);

  // Start or reuse session when a line is selected
  const startSession = async (lineId: string) => {
    if (!runId || !schoolId) return;

    // see if an active session exists for this user/line/run
    const { data: existing } = await supabase
      .from("car_line_sessions")
      .select("id,finished_at")
      .eq("dismissal_run_id", runId)
      .eq("car_line_id", lineId)
      .is("finished_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      setSession(existing[0] as any);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("car_line_sessions")
      .insert({
        school_id: schoolId,
        dismissal_run_id: runId,
        car_line_id: lineId,
        managed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id,finished_at")
      .single();

    if (!error) {
      setSession(inserted as any);
      loadPickups(inserted.id);
    }
  };

  // Load existing pickup records for the session
  const loadPickups = async (sessionId: string) => {
    if (!sessionId) return;
    
    const { data } = await supabase
      .from("car_line_pickups")
      .select("student_id, status, parent_arrived_at, picked_up_at")
      .eq("car_line_session_id", sessionId);

    if (data) {
      const pickupMap: Record<string, StudentPickup> = {};
      data.forEach((pickup: any) => {
        pickupMap[pickup.student_id] = pickup;
      });
      setPickups(pickupMap);
    }
  };

  // Handle pickup status updates
  const updatePickupStatus = async (studentId: string, currentStatus: PickupStatus) => {
    if (!session?.id) {
      toast.error("No active session");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    let newStatus: PickupStatus;
    let updateData: any = {};

    switch (currentStatus) {
      case "waiting":
        newStatus = "parent_arrived";
        updateData = {
          status: newStatus,
          parent_arrived_at: new Date().toISOString()
        };
        break;
      case "parent_arrived":
        newStatus = "picked_up";
        updateData = {
          status: newStatus,
          picked_up_at: new Date().toISOString()
        };
        break;
      case "picked_up":
        // Reset to waiting
        newStatus = "waiting";
        updateData = {
          status: newStatus,
          parent_arrived_at: null,
          picked_up_at: null
        };
        break;
      default:
        return;
    }

    // Check if record exists and update accordingly
    const existingPickup = pickups[studentId];
    let result;
    
    if (existingPickup) {
      // Update existing record
      result = await supabase
        .from("car_line_pickups")
        .update(updateData)
        .eq("car_line_session_id", session.id)
        .eq("student_id", studentId);
    } else {
      // Insert new record
      result = await supabase
        .from("car_line_pickups")
        .insert({
          car_line_session_id: session.id,
          student_id: studentId,
          managed_by: user.id,
          ...updateData
        });
    }

    const { error } = result;

    if (error) {
      console.error("Error updating pickup status:", error);
      toast.error("Failed to update pickup status");
      return;
    }

    // Update local state
    setPickups(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status: newStatus,
        parent_arrived_at: updateData.parent_arrived_at || prev[studentId]?.parent_arrived_at || null,
        picked_up_at: updateData.picked_up_at || prev[studentId]?.picked_up_at || null
      }
    }));

    // Show success message
    const student = students.find(s => s.id === studentId);
    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student';
    
    switch (newStatus) {
      case "parent_arrived":
        toast.success(`${studentName}'s parent has arrived`);
        break;
      case "picked_up":
        toast.success(`${studentName} has been picked up`);
        break;
      case "waiting":
        toast.info(`${studentName} reset to waiting`);
        break;
    }
  };

  // Load students assigned to car lines (optionally filter by selected line)
  const loadStudents = useMemo(
    () => async () => {
      if (!schoolId) return;
      setLoading(true);

      // Get assignments (optionally by selected line)
      let query = supabase.from("student_car_assignments").select("student_id,car_line_id");
      if (selectedLine) query = query.eq("car_line_id", selectedLine);
      const { data: assigns } = await query;

      const studentIds = (assigns || []).map((a) => a.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        setClasses([]);
        setLoading(false);
        return;
      }

      const { data: studs } = await supabase
        .from("students")
        .select("id,first_name,last_name,grade_level")
        .in("id", studentIds);

      // map students to class via class_rosters
      const { data: rosters } = await supabase
        .from("class_rosters")
        .select("student_id,class_id")
        .in("student_id", studentIds);

      const classIds = Array.from(new Set((rosters || []).map((r) => r.class_id)));
      let classMap: Record<string, string> = {};
      if (classIds.length) {
        const { data: cls } = await supabase.from("classes").select("id,class_name").in("id", classIds);
        const list = (cls || []) as any as ClassItem[];
        setClasses(list);
        list.forEach((c) => {
          classMap[c.id] = c.class_name;
        });
      } else {
        setClasses([]);
      }

      const list = (studs || []).map((s: any) => ({
        ...s,
        class_name: (rosters || []).find((r) => r.student_id === s.id)?.class_id
          ? classMap[(rosters || []).find((r) => r.student_id === s.id)!.class_id]
          : undefined,
      }));

      setStudents(list as any);
      setLoading(false);
    },
    [schoolId, selectedLine]
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Load pickups when session changes
  useEffect(() => {
    if (session?.id) {
      loadPickups(session.id);
    }
  }, [session?.id]);

  // Real-time subscription for pickup updates
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel('car_line_pickups_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'car_line_pickups',
          filter: `car_line_session_id=eq.${session.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pickup = payload.new as any;
            setPickups(prev => ({
              ...prev,
              [pickup.student_id]: {
                student_id: pickup.student_id,
                status: pickup.status,
                parent_arrived_at: pickup.parent_arrived_at,
                picked_up_at: pickup.picked_up_at
              }
            }));
          } else if (payload.eventType === 'DELETE') {
            const pickup = payload.old as any;
            setPickups(prev => {
              const { [pickup.student_id]: deleted, ...rest } = prev;
              return rest;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  const filtered = useMemo(() => {
    let out = [...students];
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (s: any) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          `${s.last_name}, ${s.first_name}`.toLowerCase().includes(q)
      );
    }
    if (gradeFilter !== "all") {
      out = out.filter((s) => s.grade_level === gradeFilter);
    }
    if (classFilter !== "all") {
      out = out.filter((s: any) => s.class_name === classFilter);
    }
    if (statusFilter !== "all") {
      out = out.filter((s) => {
        const pickup = pickups[s.id];
        const status = pickup?.status || "waiting";
        return status === statusFilter;
      });
    }
    // sort alpha by last, first
    out.sort((a: any, b: any) => {
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });
    return out;
  }, [students, search, gradeFilter, classFilter, statusFilter, pickups]);

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts = { waiting: 0, parent_arrived: 0, picked_up: 0 };
    students.forEach(student => {
      const status = pickups[student.id]?.status || "waiting";
      counts[status]++;
    });
    return counts;
  }, [students, pickups]);

  // Get status color and icon with enhanced visual feedback
  const getStatusDisplay = (status: PickupStatus) => {
    switch (status) {
      case "waiting":
        return {
          color: "bg-muted text-muted-foreground border-muted",
          cardBg: "bg-[hsl(var(--status-waiting-bg))] hover:bg-[hsl(var(--status-waiting-bg-hover))]",
          border: "border-[hsl(var(--status-waiting-accent))] border-l-4 border-l-[hsl(var(--status-waiting-accent))]",
          label: "Waiting",
          icon: Clock
        };
      case "parent_arrived":
        return {
          color: "bg-[hsl(var(--status-parent-arrived))] text-[hsl(var(--status-parent-arrived-foreground))] border-[hsl(var(--status-parent-arrived-accent))] shadow-md",
          cardBg: "bg-[hsl(var(--status-parent-arrived-bg))] hover:bg-[hsl(var(--status-parent-arrived-bg-hover))]",
          border: "border-[hsl(var(--status-parent-arrived-accent))] border-2 border-l-4 border-l-[hsl(var(--status-parent-arrived-accent))] shadow-lg shadow-[hsl(var(--status-parent-arrived))]/20",
          label: "Parent Here",
          icon: Car
        };
      case "picked_up":
        return {
          color: "bg-[hsl(var(--status-picked-up))] text-[hsl(var(--status-picked-up-foreground))] border-[hsl(var(--status-picked-up-accent))] shadow-md",
          cardBg: "bg-[hsl(var(--status-picked-up-bg))] hover:bg-[hsl(var(--status-picked-up-bg-hover))]",
          border: "border-[hsl(var(--status-picked-up-accent))] border-2 border-l-4 border-l-[hsl(var(--status-picked-up-accent))] shadow-lg shadow-[hsl(var(--status-picked-up))]/20",
          label: "Picked Up",
          icon: UserCheck
        };
      default:
        return {
          color: "bg-muted text-muted-foreground border-muted",
          cardBg: "bg-[hsl(var(--status-waiting-bg))] hover:bg-[hsl(var(--status-waiting-bg-hover))]",
          border: "border-[hsl(var(--status-waiting-accent))] border-l-4 border-l-[hsl(var(--status-waiting-accent))]",
          label: "Waiting",
          icon: Clock
        };
    }
  };

  const finishSession = async () => {
    if (!session?.id) return;
    await supabase.from("car_line_sessions").update({ finished_at: new Date().toISOString() }).eq("id", session.id);
    // refresh to show finished state
    setSession((s) => (s ? { ...s, finished_at: new Date().toISOString() } : s));
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <ExitModeButton label="Exit Car Line Mode" />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Car Line</h1>
            <p className="text-muted-foreground mt-2">Manage car riders for today&apos;s dismissal.</p>
          </div>
        </header>

        <Card>
          <CardContent>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:w-80">
                  <label className="text-sm text-muted-foreground">Car line location</label>
                  <Select
                    value={selectedLine}
                    onValueChange={(v) => {
                      setSelectedLine(v);
                      startSession(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select car line" />
                    </SelectTrigger>
                    <SelectContent>
                      {carLines.map((cl) => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.line_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {session && (
                  <div className="text-sm text-muted-foreground">
                    Session started • {session.finished_at ? "Finished" : "Active"}
                  </div>
                )}
              </div>
              {session && !session.finished_at && (
                <Button variant="secondary" onClick={finishSession}>
                  Mark Dismissal As Finished
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Students</CardTitle>
              {session && !session.finished_at && (
                <div className="flex gap-2 text-sm flex-wrap">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === "all" 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    All: {statusCounts.waiting + statusCounts.parent_arrived + statusCounts.picked_up}
                  </button>
                  <button
                    onClick={() => setStatusFilter("waiting")}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === "waiting" 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting: {statusCounts.waiting}
                  </button>
                  <button
                    onClick={() => setStatusFilter("parent_arrived")}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === "parent_arrived" 
                        ? "bg-warning text-warning-foreground border-warning" 
                        : "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20"
                    }`}
                  >
                    <Car className="h-3 w-3 mr-1" />
                    Parent Here: {statusCounts.parent_arrived}
                  </button>
                  <button
                    onClick={() => setStatusFilter("picked_up")}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      statusFilter === "picked_up" 
                        ? "bg-success text-success-foreground border-success" 
                        : "bg-success/10 text-success border-success/20 hover:bg-success/20"
                    }`}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Picked Up: {statusCounts.picked_up}
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80"
              />
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  <SelectItem value="PK">PK</SelectItem>
                  <SelectItem value="K">K</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.class_name}>
                      {c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="parent_arrived">Parent Here</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading || loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" /> Loading...
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((s: any) => {
                  const pickup = pickups[s.id];
                  const status = pickup?.status || "waiting";
                  const statusDisplay = getStatusDisplay(status);
                  const StatusIcon = statusDisplay.icon;
                  const isSessionActive = session && !session.finished_at;

                  return (
                    <li
                      key={s.id}
                      className={`p-4 rounded-lg transition-all duration-300 ${
                        isSessionActive 
                          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-0.5' 
                          : ''
                      } ${statusDisplay.cardBg} ${statusDisplay.border}`}
                      onClick={() => {
                        if (isSessionActive) {
                          updatePickupStatus(s.id, status);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {s.last_name}, {s.first_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Grade {s.grade_level}
                            {s.class_name ? ` • ${s.class_name}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${statusDisplay.color} flex items-center gap-1.5 px-3 py-1 text-sm font-medium`}
                          >
                            <StatusIcon className="h-4 w-4" />
                            {statusDisplay.label}
                          </Badge>
                        </div>
                      </div>
                      {isSessionActive && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {status === "waiting" && "Click to mark parent arrived"}
                          {status === "parent_arrived" && "Click to mark picked up"}
                          {status === "picked_up" && "Click to reset to waiting"}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
