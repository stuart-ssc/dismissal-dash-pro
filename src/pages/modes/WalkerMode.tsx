
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ExitModeButton from "@/components/ExitModeButton";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type WalkerLocation = { id: string; location_name: string };
type Student = { id: string; first_name: string; last_name: string; grade_level: string };
type ClassItem = { id: string; class_name: string };
type Session = { id: string; finished_at: string | null };
type WalkerPickup = { id: string; student_id: string; status: string; left_at?: string };
type PickupStatus = "waiting" | "left_building";

export default function WalkerMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const { toast } = useToast();
  const [locations, setLocations] = useState<WalkerLocation[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pickups, setPickups] = useState<Record<string, WalkerPickup>>({});
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PickupStatus | "all">("all");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);

  const runId = run?.id;

  useEffect(() => {
    const loadLocations = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from("walker_locations")
        .select("id,location_name")
        .eq("school_id", schoolId)
        .order("location_name", { ascending: true });
      setLocations((data || []) as any);
    };
    loadLocations();
  }, [schoolId]);

  // Start or reuse session when a location is selected
  const startSession = async (locId: string) => {
    if (!runId || !schoolId) return;

    const { data: existing } = await supabase
      .from("walker_sessions")
      .select("id,finished_at")
      .eq("dismissal_run_id", runId)
      .eq("walker_location_id", locId)
      .is("finished_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      setSession(existing[0] as any);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("walker_sessions")
      .insert({
        school_id: schoolId,
        dismissal_run_id: runId,
        walker_location_id: locId,
        managed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id,finished_at")
      .single();

    if (!error) setSession(inserted as any);
  };

  // Load students assigned as walkers (optionally by selected location)
  const loadStudents = useMemo(
    () => async () => {
      if (!schoolId) return;
      setLoading(true);

      let query = supabase.from("student_walker_assignments").select("student_id,walker_location_id");
      if (selectedLoc) query = query.eq("walker_location_id", selectedLoc);
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

      // map to classes via class_rosters
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
        list.forEach((c) => (classMap[c.id] = c.class_name));
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
    [schoolId, selectedLoc]
  );

  // Load walker pickups for current session
  const loadPickups = async () => {
    if (!session?.id) return;
    const { data } = await supabase
      .from("walker_pickups")
      .select("id,student_id,status,left_at")
      .eq("walker_session_id", session.id);
    
    const pickupMap: Record<string, WalkerPickup> = {};
    (data || []).forEach((pickup: any) => {
      pickupMap[pickup.student_id] = pickup;
    });
    setPickups(pickupMap);
  };

  // Handle student click to update status
  const handleStudentClick = async (studentId: string) => {
    if (!session?.id) return;
    
    const currentPickup = pickups[studentId];
    const currentStatus = currentPickup?.status || "waiting";
    const newStatus = currentStatus === "waiting" ? "left_building" : "waiting";
    
    const user = await supabase.auth.getUser();
    if (!user.data.user?.id) return;

    try {
      if (currentPickup) {
        // Update existing pickup
        const updateData: any = { 
          status: newStatus,
          managed_by: user.data.user.id
        };
        
        if (newStatus === "left_building") {
          updateData.left_at = new Date().toISOString();
        } else {
          updateData.left_at = null;
        }

        await supabase
          .from("walker_pickups")
          .update(updateData)
          .eq("id", currentPickup.id);
      } else {
        // Create new pickup
        const insertData: any = {
          walker_session_id: session.id,
          student_id: studentId,
          status: newStatus,
          managed_by: user.data.user.id
        };
        
        if (newStatus === "left_building") {
          insertData.left_at = new Date().toISOString();
        }

        await supabase
          .from("walker_pickups")
          .insert(insertData);
      }

      // Show success toast
      const student = students.find(s => s.id === studentId);
      const statusText = newStatus === "left_building" ? "Left Building" : "Waiting";
      toast({
        title: "Status Updated",
        description: `${student?.first_name} ${student?.last_name} marked as ${statusText}`,
      });
    } catch (error) {
      console.error("Error updating walker pickup:", error);
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive",
      });
    }
  };

  // Get status display info
  const getStatusDisplay = (status: PickupStatus) => {
    switch (status) {
      case "waiting":
        return {
          icon: Clock,
          color: "text-muted-foreground",
          bg: "bg-muted/50",
          label: "Waiting"
        };
      case "left_building":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-50 dark:bg-green-950/20",
          label: "Left Building"
        };
    }
  };

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { waiting: 0, left_building: 0 };
    students.forEach(student => {
      const pickup = pickups[student.id];
      const status = pickup?.status || "waiting";
      counts[status as PickupStatus]++;
    });
    return counts;
  }, [students, pickups]);

  useEffect(() => {
    loadPickups();
  }, [session?.id]);

  // Real-time subscription for walker pickups
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel('walker-pickups')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walker_pickups',
          filter: `walker_session_id=eq.${session.id}`
        },
        () => {
          loadPickups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    let out = [...students];
    
    // Text search
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (s: any) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          `${s.last_name}, ${s.first_name}`.toLowerCase().includes(q)
      );
    }
    
    // Grade filter
    if (gradeFilter !== "all") {
      out = out.filter((s) => s.grade_level === gradeFilter);
    }
    
    // Class filter
    if (classFilter !== "all") {
      out = out.filter((s: any) => s.class_name === classFilter);
    }
    
    // Status filter
    if (statusFilter !== "all") {
      out = out.filter((s) => {
        const pickup = pickups[s.id];
        const status = pickup?.status || "waiting";
        return status === statusFilter;
      });
    } else {
      // When filter is "all", exclude left_building students (show only waiting)
      out = out.filter((s) => {
        const pickup = pickups[s.id];
        const status = pickup?.status || "waiting";
        return status !== "left_building";
      });
    }
    
    // Sort alphabetically
    out.sort((a: any, b: any) => {
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });
    return out;
  }, [students, search, gradeFilter, classFilter, statusFilter, pickups]);

  const finishSession = async () => {
    if (!session?.id) return;
    await supabase.from("walker_sessions").update({ finished_at: new Date().toISOString() }).eq("id", session.id);
    setSession((s) => (s ? { ...s, finished_at: new Date().toISOString() } : s));
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Walker</h1>
          <p className="text-muted-foreground mt-2">Manage walkers for today&apos;s dismissal.</p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="mt-6 w-full sm:w-80">
              <label className="text-sm text-muted-foreground">Walker location</label>
              <Select
                value={selectedLoc}
                onValueChange={(v) => {
                  setSelectedLoc(v);
                  startSession(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select walker location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
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
            {session && !session.finished_at && (
              <Button variant="secondary" onClick={finishSession}>
                Mark Dismissal As Finished
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
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
            </div>

            {/* Status filter buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                All: {statusCounts.waiting}
              </button>
              <button
                onClick={() => setStatusFilter("waiting")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "waiting"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                Waiting: {statusCounts.waiting}
              </button>
              <button
                onClick={() => setStatusFilter("left_building")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "left_building"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                Left Building: {statusCounts.left_building}
              </button>
            </div>

            {isLoading || loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" /> Loading...
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((s: any) => {
                  const pickup = pickups[s.id];
                  const status = (pickup?.status || "waiting") as PickupStatus;
                  const statusInfo = getStatusDisplay(status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => handleStudentClick(s.id)}
                        className={`w-full p-4 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${statusInfo.bg} border-border hover:border-primary/50`}
                        disabled={!session || !!session.finished_at}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">
                              {s.last_name}, {s.first_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Grade {s.grade_level}
                              {s.class_name ? ` • ${s.class_name}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ExitModeButton label="Exit Walker Mode" />
    </div>
  );
}
