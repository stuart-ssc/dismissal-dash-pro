import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { useAuth } from "@/hooks/useAuth";
import ExitModeButton from "@/components/ExitModeButton";
import { useModeLogger } from "@/hooks/useModeLogger";
import { Loader2, Clock, AlertCircle, CheckCircle } from "lucide-react";

type ActiveGroup = {
  id: string;
  name: string;
  group_type: string | null;
  release_offset_minutes: number;
  scheduled_release_time: Date;
  actual_release_time?: Date;
  status: 'pending' | 'active' | 'delayed' | 'completed';
  delay_reason?: string;
  buses: {
    id: string;
    bus_number: string;
    checked_in: boolean;
  }[];
  students: {
    id: string;
    first_name: string;
    last_name: string;
    destination: string;
  }[];
};

export default function ClassroomMode() {
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [groups, setGroups] = useState<ActiveGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [dismissalTime, setDismissalTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const [teacherClassName, setTeacherClassName] = useState<string | null>(null);

  const runId = run?.id;
  const planId = run?.plan_id ?? null;

  // Track mode usage for reporting
  useModeLogger({
    mode: 'classroom',
    schoolId,
    dismissalRunId: run?.id,
  });

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch plan details
  useEffect(() => {
    if (!planId) {
      setPlanName(null);
      setDismissalTime(null);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("dismissal_plans")
        .select("name, dismissal_time")
        .eq("id", planId)
        .single();

      if (!error) {
        setPlanName(data?.name ?? null);
        setDismissalTime(data?.dismissal_time ?? null);
      }
    })();
  }, [planId]);

  // Fetch teacher class name
  useEffect(() => {
    if (!user?.id) {
      setTeacherClassName(null);
      return;
    }

    (async () => {
      const { data: ct, error: ctErr } = await supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", user.id)
        .order("assigned_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ctErr || !ct?.class_id) {
        if (ctErr) console.warn("Error fetching teacher class:", ctErr.message);
        setTeacherClassName(null);
        return;
      }

      const { data: cls, error: clsErr } = await supabase
        .from("classes")
        .select("class_name")
        .eq("id", ct.class_id)
        .maybeSingle();

      if (clsErr) {
        console.warn("Error fetching class name:", clsErr.message);
        setTeacherClassName(null);
        return;
      }

      setTeacherClassName(cls?.class_name ?? null);
    })();
  }, [user?.id]);

  // Calculate time-based active groups
  const fetchTimeBasedGroups = useMemo(() => async () => {
    if (!runId || !planId || !dismissalTime || !user?.id) {
      setGroups([]);
      setLoadingGroups(false);
      return;
    }

    setLoadingGroups(true);

    try {
      // Get teacher's class and students
      const { data: classTeacher } = await supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", user.id)
        .limit(1)
        .maybeSingle();

      let teacherStudentIds: string[] = [];
      if (classTeacher?.class_id) {
        const { data: roster } = await supabase
          .from("class_rosters")
          .select("student_id")
          .eq("class_id", classTeacher.class_id);
        
        teacherStudentIds = (roster || []).map(r => r.student_id);
      }

      // Get all groups from the plan
      const { data: allGroups, error: groupsErr } = await supabase
        .from("dismissal_groups")
        .select("id, name, group_type, release_offset_minutes, walker_location_id")
        .eq("dismissal_plan_id", planId)
        .order("release_offset_minutes", { ascending: true });

      if (groupsErr) {
        console.error("Error fetching groups:", groupsErr);
        setLoadingGroups(false);
        return;
      }

      if (!allGroups || allGroups.length === 0) {
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      // Use run.scheduled_start_time (UTC) as the base, not browser local time
      // scheduled_start_time is already correctly computed by calculate_dismissal_times
      const activeGroups: ActiveGroup[] = [];

      // Get the base dismissal start time from the run
      const baseDismissalTime = run?.scheduled_start_time 
        ? new Date(run.scheduled_start_time)
        : new Date(); // Fallback (shouldn't happen)

      for (const group of allGroups) {
        const scheduledReleaseTime = new Date(baseDismissalTime.getTime() + (group.release_offset_minutes * 60000));
        const now = currentTime;
        
        // In testing mode, bypass time filters and show all groups
        const inTestingMode = run?.testing_mode === true;
        
        // Check if this group should be active (within 5 minutes of release time)
        const timeDiff = scheduledReleaseTime.getTime() - now.getTime();
        const shouldBeActive = inTestingMode || (timeDiff <= 5 * 60000 && timeDiff >= -60 * 60000);

        if (!shouldBeActive) continue;

        let status: ActiveGroup['status'] = 'active';
        let delay_reason: string | undefined;
        let actual_release_time = scheduledReleaseTime;
        let buses: ActiveGroup['buses'] = [];
        let students: ActiveGroup['students'] = [];

        // Handle bus groups - check if buses are checked in
        if (group.group_type && group.group_type.toLowerCase().includes("bus")) {
          // Get buses for this group
          const { data: groupBuses } = await supabase
            .from("dismissal_group_buses")
            .select("bus_id")
            .eq("dismissal_group_id", group.id);

          if (groupBuses && groupBuses.length > 0) {
            const busIds = groupBuses.map(gb => gb.bus_id);
            
            // Get bus details and check-in status
            const { data: busDetails } = await supabase
              .from("buses")
              .select("id, bus_number")
              .in("id", busIds)
              .eq("school_id", schoolId ?? -1);

            const { data: busEvents } = await supabase
              .from("bus_run_events")
              .select("bus_id, check_in_time")
              .eq("dismissal_run_id", runId)
              .in("bus_id", busIds);

            buses = (busDetails || []).map(bus => ({
              id: bus.id,
              bus_number: bus.bus_number,
              checked_in: (busEvents || []).some(event => event.bus_id === bus.id && event.check_in_time)
            }));

            const uncheckedBuses = buses.filter(b => !b.checked_in);
            
            if (uncheckedBuses.length > 0 && timeDiff <= 0) {
              // This group should be active but buses aren't checked in - apply delay logic
              const nextBusGroup = allGroups.find(g => 
                g.group_type?.toLowerCase().includes("bus") && 
                g.release_offset_minutes > group.release_offset_minutes
              );

              if (nextBusGroup) {
                // Delay to next bus group time
                actual_release_time = new Date(baseDismissalTime.getTime() + (nextBusGroup.release_offset_minutes * 60000));
                status = 'delayed';
                delay_reason = `Waiting for buses: ${uncheckedBuses.map(b => b.bus_number).join(', ')}`;
              } else {
                // Last bus group - show anyway but mark as delayed
                status = 'delayed';
                delay_reason = `Buses not checked in: ${uncheckedBuses.map(b => b.bus_number).join(', ')}`;
              }
            }
          }
        }

        // Fetch students for this group based on type
        if (teacherStudentIds.length > 0) {
          // Get all students in the teacher's class
          const { data: allStudents } = await supabase
            .from("students")
            .select("id, first_name, last_name")
            .in("id", teacherStudentIds);

          const studentMap = new Map((allStudents || []).map(s => [s.id, s]));

          if (group.group_type?.toLowerCase().includes("bus")) {
            // Get buses for this group
            const { data: groupBuses } = await supabase
              .from("dismissal_group_buses")
              .select("bus_id")
              .eq("dismissal_group_id", group.id);

            if (groupBuses && groupBuses.length > 0) {
              const busIds = groupBuses.map(gb => gb.bus_id);
              
              // Get bus assignments for teacher's students
              const { data: busAssignments } = await supabase
                .from("student_bus_assignments")
                .select("student_id, bus_id")
                .in("student_id", teacherStudentIds)
                .in("bus_id", busIds);

              // Get bus numbers
              const { data: busDetails } = await supabase
                .from("buses")
                .select("id, bus_number")
                .in("id", busIds);

              const busNumberMap = new Map((busDetails || []).map(b => [b.id, b.bus_number]));

              students = (busAssignments || [])
                .map(ba => {
                  const student = studentMap.get(ba.student_id);
                  if (!student) return null;
                  return {
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    destination: `Bus ${busNumberMap.get(ba.bus_id) || 'Unknown'}`
                  };
                })
                .filter((s): s is NonNullable<typeof s> => s !== null);
            }
          } else if (group.group_type?.toLowerCase().includes("car")) {
            // Get car lines for this group
            const { data: groupCarLines } = await supabase
              .from("dismissal_group_car_lines")
              .select("car_line_id")
              .eq("dismissal_group_id", group.id);

            if (groupCarLines && groupCarLines.length > 0) {
              const carLineIds = groupCarLines.map(gc => gc.car_line_id);
              
              // Get car line assignments for teacher's students
              const { data: carAssignments } = await supabase
                .from("student_car_assignments")
                .select("student_id, car_line_id")
                .in("student_id", teacherStudentIds)
                .in("car_line_id", carLineIds);

              // Get car line names
              const { data: carLineDetails } = await supabase
                .from("car_lines")
                .select("id, line_name")
                .in("id", carLineIds);

              const carLineNameMap = new Map((carLineDetails || []).map(cl => [cl.id, cl.line_name]));

              students = (carAssignments || [])
                .map(ca => {
                  const student = studentMap.get(ca.student_id);
                  if (!student) return null;
                  return {
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    destination: carLineNameMap.get(ca.car_line_id) || 'Car Line'
                  };
                })
                .filter((s): s is NonNullable<typeof s> => s !== null);
            }
          } else if (group.group_type?.toLowerCase().includes("walker") && group.walker_location_id) {
            // Get walker assignments for teacher's students
            const { data: walkerAssignments } = await supabase
              .from("student_walker_assignments")
              .select("student_id")
              .in("student_id", teacherStudentIds)
              .eq("walker_location_id", group.walker_location_id);

            // Get walker location name
            const { data: walkerLocation } = await supabase
              .from("walker_locations")
              .select("location_name")
              .eq("id", group.walker_location_id)
              .single();

            students = (walkerAssignments || [])
              .map(wa => {
                const student = studentMap.get(wa.student_id);
                if (!student) return null;
                return {
                  id: student.id,
                  first_name: student.first_name,
                  last_name: student.last_name,
                  destination: walkerLocation?.location_name || 'Walker Location'
                };
              })
              .filter((s): s is NonNullable<typeof s> => s !== null);
          } else if (group.group_type?.toLowerCase().includes("activity")) {
            // Get activities for this group
            const { data: groupActivities } = await supabase
              .from("dismissal_group_activities")
              .select("after_school_activity_id")
              .eq("dismissal_group_id", group.id);

            if (groupActivities && groupActivities.length > 0) {
              const activityIds = groupActivities.map(ga => ga.after_school_activity_id);
              
              // Get activity assignments for teacher's students
              const { data: activityAssignments } = await supabase
                .from("student_after_school_assignments")
                .select("student_id, after_school_activity_id")
                .in("student_id", teacherStudentIds)
                .in("after_school_activity_id", activityIds);

              // Get activity names
              const { data: activityDetails } = await supabase
                .from("after_school_activities")
                .select("id, activity_name")
                .in("id", activityIds);

              const activityNameMap = new Map((activityDetails || []).map(a => [a.id, a.activity_name]));

              students = (activityAssignments || [])
                .map(aa => {
                  const student = studentMap.get(aa.student_id);
                  if (!student) return null;
                  return {
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    destination: activityNameMap.get(aa.after_school_activity_id) || 'After School Activity'
                  };
                })
                .filter((s): s is NonNullable<typeof s> => s !== null);
            }
          }

          // Sort students by last name, then first name
          students.sort((a, b) => {
            const lastNameCompare = a.last_name.localeCompare(b.last_name);
            if (lastNameCompare !== 0) return lastNameCompare;
            return a.first_name.localeCompare(b.first_name);
          });
        }

        // Check if this group has been completed in any mode
        const isCompleted = await checkGroupCompletion(group.id, runId);
        if (isCompleted) {
          status = 'completed';
        }

        activeGroups.push({
          id: group.id,
          name: group.name,
          group_type: group.group_type,
          release_offset_minutes: group.release_offset_minutes,
          scheduled_release_time: scheduledReleaseTime,
          actual_release_time,
          status,
          delay_reason,
          buses,
          students
        });
      }

      // Auto-timeout logic is now handled by RouteGuard to prevent race conditions

      // Sort groups: completed groups first (most recent first), then active/pending by offset
      activeGroups.sort((a, b) => {
        // Completed groups come first
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        
        // Both completed: sort by release time descending (most recent first)
        if (a.status === 'completed' && b.status === 'completed') {
          const timeA = a.actual_release_time?.getTime() || a.scheduled_release_time.getTime();
          const timeB = b.actual_release_time?.getTime() || b.scheduled_release_time.getTime();
          return timeB - timeA; // Descending
        }
        
        // Both active/pending/delayed: maintain original order by offset
        return a.release_offset_minutes - b.release_offset_minutes;
      });

      setGroups(activeGroups);
    } catch (error) {
      console.error("Error calculating time-based groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  }, [runId, schoolId, planId, dismissalTime, currentTime, user?.id]);

  // Check if a group has been completed
  const checkGroupCompletion = async (groupId: string, runId: string): Promise<boolean> => {
    // Check if buses in this group have all departed
    const { data: groupBuses } = await supabase
      .from("dismissal_group_buses")
      .select("bus_id")
      .eq("dismissal_group_id", groupId);

    if (groupBuses && groupBuses.length > 0) {
      const busIds = groupBuses.map(gb => gb.bus_id);
      const { data: busEvents } = await supabase
        .from("bus_run_events")
        .select("bus_id, departed_at")
        .eq("dismissal_run_id", runId)
        .in("bus_id", busIds);

      const allDeparted = busIds.every(busId => 
        (busEvents || []).some(event => event.bus_id === busId && event.departed_at)
      );
      
      if (allDeparted) return true;
    }

    // Check car line completion
    const { data: groupCarLines } = await supabase
      .from("dismissal_group_car_lines")
      .select("car_line_id")
      .eq("dismissal_group_id", groupId);

    if (groupCarLines && groupCarLines.length > 0) {
      const { data: carLineSessions } = await supabase
        .from("car_line_sessions")
        .select("finished_at")
        .eq("dismissal_run_id", runId)
        .in("car_line_id", groupCarLines.map(gc => gc.car_line_id));

      const allFinished = (carLineSessions || []).every(session => session.finished_at);
      if (allFinished) return true;
    }

    // Check walker completion
    const { data: groupWalkers } = await supabase
      .from("dismissal_groups")
      .select("walker_location_id")
      .eq("id", groupId)
      .not("walker_location_id", "is", null);

    if (groupWalkers && groupWalkers.length > 0) {
      const { data: walkerSessions } = await supabase
        .from("walker_sessions")
        .select("finished_at")
        .eq("dismissal_run_id", runId)
        .in("walker_location_id", groupWalkers.map(gw => gw.walker_location_id));

      const allFinished = (walkerSessions || []).every(session => session.finished_at);
      if (allFinished) return true;
    }

    return false;
  };

  useEffect(() => {
    fetchTimeBasedGroups();
  }, [fetchTimeBasedGroups]);

  // Real-time updates for bus events and other changes
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel("classroom-updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bus_run_events",
        filter: `dismissal_run_id=eq.${runId}`
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "car_line_sessions",
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "walker_sessions",
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "student_bus_assignments",
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "student_car_assignments",
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "student_walker_assignments",
      }, () => {
        fetchTimeBasedGroups();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "student_after_school_assignments",
      }, () => {
        fetchTimeBasedGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, fetchTimeBasedGroups]);

  const getStatusIcon = (status: ActiveGroup['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'delayed':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ActiveGroup['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center">
            Classroom Dismissal
          </h1>
          
          <p className="text-muted-foreground mt-2 text-center">
            Groups are automatically displayed based on dismissal timing.
          </p>
          {planName && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Plan: {planName} | Current Time: {formatTime(currentTime)}
            </p>
          )}
          {teacherClassName && (
            <p className="text-sm text-muted-foreground text-center">
              Class: {teacherClassName}
            </p>
          )}
        </header>

        {run && !planId && (
          <Alert className="mb-6">
            <AlertTitle>No dismissal plan assigned for today</AlertTitle>
            <AlertDescription>
              Please set a date-specific plan for today or mark a default plan in Dismissal Plans.
            </AlertDescription>
          </Alert>
        )}

        {isLoading || loadingGroups ? (
          <div className="flex items-center gap-2 text-muted-foreground justify-center">
            <Loader2 className="animate-spin" />
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center">
            <p className="text-xl text-muted-foreground">No groups are scheduled for release yet.</p>
            {dismissalTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Dismissal starts at {(() => {
                  const [hours, minutes] = dismissalTime.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes);
                  return formatTime(date);
                })()}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map(group => (
              <Card key={group.id} className={`border-2 ${
                group.status === 'active' ? 'border-green-500' : 
                group.status === 'delayed' ? 'border-yellow-500' : 
                group.status === 'completed' ? 'border-gray-400' : 
                'border-blue-500'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl flex items-center gap-2">
                      {getStatusIcon(group.status)}
                      {group.name}
                    </CardTitle>
                    {getStatusBadge(group.status)}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div>Scheduled: {formatTime(group.scheduled_release_time)}</div>
                    {group.actual_release_time && group.actual_release_time !== group.scheduled_release_time && (
                      <div>Actual: {formatTime(group.actual_release_time)}</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {group.delay_reason && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{group.delay_reason}</AlertDescription>
                    </Alert>
                  )}
                  
                  {group.group_type && group.group_type.toLowerCase().includes("bus") ? (
                    <div>
                      <p className="text-muted-foreground mb-2">Buses:</p>
                      <div className="flex flex-wrap gap-2">
                        {group.buses.map(bus => (
                          <span 
                            key={bus.id} 
                            className={`px-3 py-1 rounded-full text-lg flex items-center gap-1 ${
                              bus.checked_in 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {bus.checked_in ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            {bus.bus_number}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {group.status === 'completed' ? 
                        'This group has been dismissed.' : 
                        'This group is ready for dismissal.'
                      }
                    </p>
                  )}

                  {/* Students in this group from teacher's class */}
                  {group.students.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="font-semibold mb-2">Your Students ({group.students.length}):</p>
                      <div className="space-y-1">
                        {group.students.map(student => (
                          <div 
                            key={student.id} 
                            className="flex justify-between items-center py-1 px-2 rounded hover:bg-muted/50"
                          >
                            <span className="text-sm">
                              {student.last_name}, {student.first_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              → {student.destination}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Exit Button - Below All Content */}
        <div className="mt-8 flex justify-center">
          <ExitModeButton label="Exit Classroom Mode" inHeader />
        </div>
      </div>
    </div>
  );
}