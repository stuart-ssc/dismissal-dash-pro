
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ExitModeButton from "@/components/ExitModeButton";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { useModeLogger } from "@/hooks/useModeLogger";
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
  const { run, schoolId, isLoading, refetch } = useTodayDismissalRun();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [leftBuildingButtonFlash, setLeftBuildingButtonFlash] = useState(false);
  
  // Check if location is completed
  const [locationCompleted, setLocationCompleted] = useState(false);
  const [completedLocations, setCompletedLocations] = useState<Set<string>>(new Set());
  const [activeTeachers, setActiveTeachers] = useState<string[]>([]);

  const runId = run?.id;

  // Track mode usage for reporting
  const selectedLocationName = locations.find(loc => loc.id === selectedLoc)?.location_name;
  useModeLogger({
    mode: 'walker',
    schoolId,
    dismissalRunId: run?.id,
    locationId: selectedLoc || null,
    locationName: selectedLocationName || null,
  });

  useEffect(() => {
    const loadLocations = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from("walker_locations")
        .select("id,location_name")
        .eq("school_id", schoolId)
        .order("location_name", { ascending: true });
      setLocations((data || []) as any);
      
      // Load completed locations
      if (runId) {
        loadCompletedLocations();
      }
    };
    loadLocations();
  }, [schoolId, runId]);

  // Load completed locations for today's dismissal run
  const loadCompletedLocations = async () => {
    if (!runId) return;
    
    const { data } = await supabase
      .from("walker_location_completions")
      .select("walker_location_id")
      .eq("dismissal_run_id", runId);
    
    const completed = new Set((data || []).map(item => item.walker_location_id));
    setCompletedLocations(completed);
  };

  // Start or reuse session when a location is selected - allows multiple sessions per location
  const startSession = async (locId: string) => {
    if (!runId || !schoolId) return;

    // Check if this location is already completed
    if (completedLocations.has(locId)) {
      toast({
        title: "Location Complete",
        description: "This walker location has already been completed. Please select a different location.",
        variant: "destructive",
      });
      setSelectedLoc("");
      return;
    }

    // Always create a new session to allow multiple teachers at same location
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

    if (!error) {
      setSession(inserted as any);
      setLocationCompleted(false);
    }
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

  // Load walker pickups for current location (all sessions)
  const loadPickups = async () => {
    if (!selectedLoc || !runId) return;
    
    // Get all sessions for this location and dismissal run
    const { data: sessions } = await supabase
      .from("walker_sessions")
      .select("id")
      .eq("dismissal_run_id", runId)
      .eq("walker_location_id", selectedLoc);

    if (!sessions || sessions.length === 0) return;

    const sessionIds = sessions.map(s => s.id);
    const { data } = await supabase
      .from("walker_pickups")
      .select("id,student_id,status,left_at")
      .in("walker_session_id", sessionIds);
    
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

        // Optimistically update local state immediately
        setPickups(prev => ({
          ...prev,
          [studentId]: {
            ...currentPickup,
            status: newStatus,
            left_at: newStatus === "left_building" ? new Date().toISOString() : null
          }
        }));
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

        // Optimistically update local state immediately
        setPickups(prev => ({
          ...prev,
          [studentId]: {
            id: 'temp-id', // Will be replaced by real-time update
            walker_session_id: session.id,
            student_id: studentId,
            status: newStatus,
            left_at: newStatus === "left_building" ? new Date().toISOString() : undefined,
            managed_by: user.data.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));
      }

      // Show success toast
      const student = students.find(s => s.id === studentId);
      const statusText = newStatus === "left_building" ? "Left Building" : "Waiting";
      toast({
        title: "Status Updated",
        description: `${student?.first_name} ${student?.last_name} marked as ${statusText}`,
      });

      // Trigger flash effect for Left Building button when student is marked as left_building
      if (newStatus === "left_building") {
        setLeftBuildingButtonFlash(true);
        setTimeout(() => setLeftBuildingButtonFlash(false), 1000);
      }
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
  // Get available grades from students
  const availableGrades = useMemo(() => {
    const grades = Array.from(new Set(students.map(s => s.grade_level)))
      .filter(grade => grade) // Remove any null/undefined grades
      .sort((a, b) => {
        // Custom sort to handle PK, K, and numbers
        if (a === 'PK') return -1;
        if (b === 'PK') return 1;
        if (a === 'K') return -1;
        if (b === 'K') return 1;
        return Number(a) - Number(b);
      });
    return grades;
  }, [students]);

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
    loadActiveTeachers();
  }, [selectedLoc, runId]);

  // Real-time subscription for walker pickups and location completion
  useEffect(() => {
    if (!selectedLoc || !runId) return;

    const channel = supabase
      .channel('walker-collaboration')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walker_pickups'
        },
        () => {
          loadPickups();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'walker_location_completions',
          filter: `dismissal_run_id=eq.${runId}`
        },
        (payload) => {
          const completion = payload.new as any;
          // Update completed locations state
          setCompletedLocations(prev => new Set([...prev, completion.walker_location_id]));
          
          if (completion.walker_location_id === selectedLoc) {
            setLocationCompleted(true);
            toast({
              title: "Location Complete",
              description: "This walker location has been completed by another teacher. Redirecting...",
            });
            setTimeout(() => {
              navigate("/dashboard/dismissal", { replace: true });
            }, 2000);
          } else {
            toast({
              title: "Location Complete",
              description: `${locations.find(loc => loc.id === completion.walker_location_id)?.location_name || 'A walker location'} has been completed by another teacher.`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'walker_sessions',
          filter: `walker_location_id=eq.${selectedLoc}`
        },
        () => {
          // Update active teachers count
          loadActiveTeachers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLoc, runId]);

  // Load active teachers for current location
  const loadActiveTeachers = async () => {
    if (!selectedLoc || !runId) return;
    
    const { data: sessions } = await supabase
      .from("walker_sessions")
      .select("managed_by")
      .eq("dismissal_run_id", runId)
      .eq("walker_location_id", selectedLoc)
      .is("finished_at", null);

    const teacherIds = Array.from(new Set((sessions || []).map(s => s.managed_by)));
    setActiveTeachers(teacherIds);
  };

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
    }
    
    // Sort by status first (waiting before left_building), then alphabetically
    out.sort((a: any, b: any) => {
      const aPickup = pickups[a.id];
      const bPickup = pickups[b.id];
      const aStatus = aPickup?.status || "waiting";
      const bStatus = bPickup?.status || "waiting";
      
      // Sort waiting students first, left_building students last
      if (aStatus !== bStatus) {
        return aStatus === "waiting" ? -1 : 1;
      }
      
      // Within same status, sort alphabetically
      const aName = `${a.last_name} ${a.first_name}`;
      const bName = `${b.last_name} ${b.first_name}`;
      return aName.localeCompare(bName);
    });
    return out;
  }, [students, search, gradeFilter, classFilter, statusFilter, pickups]);

  const finishLocation = async () => {
    if (!selectedLoc || !runId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive",
        });
        return;
      }

      const now = new Date().toISOString();

      // Mark this specific location as completed
      const { error: completionError } = await supabase
        .from("walker_location_completions")
        .insert({
          dismissal_run_id: runId,
          walker_location_id: selectedLoc,
          completed_by: user.id,
          completed_at: now
        });

      if (completionError) {
        console.error('Error marking location complete:', completionError);
        toast({
          title: "Error",
          description: "Failed to complete location",
          variant: "destructive",
        });
        return;
      }

      // Finish all active sessions for this location
      const { error: sessionError } = await supabase
        .from("walker_sessions")
        .update({ finished_at: now })
        .eq("dismissal_run_id", runId)
        .eq("walker_location_id", selectedLoc)
        .is("finished_at", null);

      if (sessionError) {
        console.error('Error finishing sessions:', sessionError);
      }

      // Check if ALL walker locations are now completed
      const { data: allLocations } = await supabase
        .from("walker_locations")
        .select("id")
        .eq("school_id", schoolId);

      const { data: completedLocations } = await supabase
        .from("walker_location_completions")
        .select("walker_location_id")
        .eq("dismissal_run_id", runId);

      const totalLocations = allLocations?.length || 0;
      const completedCount = completedLocations?.length || 0;
      const allLocationsDone = completedCount >= totalLocations;

      let successMessage = "Walker location completed!";
      let shouldNavigate = true;

      // Only mark walker mode as completed if ALL locations are done
      if (allLocationsDone) {
        const { error: updateError } = await supabase
          .from('dismissal_runs')
          .update({
            walker_completed: true,
            walker_completed_at: now,
            walker_completed_by: user.id,
            updated_at: now
          })
          .eq('id', runId);

        if (updateError) {
          console.error('Error updating dismissal_runs:', updateError);
        } else {
          successMessage = "All walker locations finished - Walker dismissal completed!";
        }
      } else {
        const remainingCount = totalLocations - completedCount;
        successMessage = `Location completed! ${remainingCount} location${remainingCount > 1 ? 's' : ''} remaining.`;
      }

      // Set location as completed
      setLocationCompleted(true);

      // Refresh the dismissal run data to reflect any changes
      await refetch();

      toast({
        title: "Success",
        description: successMessage,
      });
      
      // Navigate back to dismissal dashboard
      setTimeout(() => {
        navigate("/dashboard/dismissal");
      }, 1500);

    } catch (error) {
      console.error('Error completing location:', error);
      toast({
        title: "Error",
        description: "Failed to complete walker location",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Walker</h1>
          <p className="text-muted-foreground mt-2">Manage walkers for today&apos;s dismissal.</p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="mt-6 w-full sm:w-80">
                <label className="text-sm text-muted-foreground">Walker location</label>
                <Select
                  value={selectedLoc}
                  onValueChange={(v) => {
                    if (!completedLocations.has(v)) {
                      setSelectedLoc(v);
                      startSession(v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select walker location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => {
                      const isCompleted = completedLocations.has(loc.id);
                      return (
                        <SelectItem 
                          key={loc.id} 
                          value={loc.id}
                          disabled={isCompleted}
                          className={isCompleted ? "text-muted-foreground" : ""}
                        >
                          {loc.location_name}
                          {isCompleted && " - Already Completed Today"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {session && (
                <div className="text-sm text-muted-foreground">
                  Session started • {locationCompleted ? "Location Complete" : "Active"}
                  {activeTeachers.length > 1 && (
                    <div className="text-xs text-blue-600 mt-1">
                      {activeTeachers.length} teachers managing this location
                    </div>
                  )}
                </div>
              )}
            </div>
            {session && !locationCompleted && (
              <Button variant="secondary" onClick={finishLocation}>
                Complete Walker Location
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
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade === 'K' ? 'K' : grade === 'PK' ? 'PK' : `Grade ${grade}`}
                    </SelectItem>
                  ))}
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  leftBuildingButtonFlash
                    ? "bg-green-500 text-white"
                    : statusFilter === "left_building"
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
