import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { useAuth } from "@/hooks/useAuth";
import ExitModeButton from "@/components/ExitModeButton";
import { useModeLogger } from "@/hooks/useModeLogger";
import { Loader2, AlertTriangle } from "lucide-react";
import { GroupViewLayout } from "@/components/classroom-modes/GroupViewLayout";
import { TransportationColumnsLayout } from "@/components/classroom-modes/TransportationColumnsLayout";
import { ClassroomModeLayoutToggle } from "@/components/ClassroomModeLayoutToggle";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";

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
  const [layout, setLayout] = useState<'group-view' | 'student-view' | 'transportation-view'>(() => {
    const saved = localStorage.getItem('classroom-layout');
    return (saved === 'transportation-view' || saved === 'student-view' || saved === 'group-view') 
      ? saved as 'group-view' | 'student-view' | 'transportation-view'
      : 'transportation-view';
  });
  
  // NEW: Add state for class selection
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);
  
  // NEW: Fetch all accessible classes for today
  const { classes: accessibleClasses, loading: classesLoading } = useTeacherClasses();

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

  // Fetch teacher class name with class selection support
  useEffect(() => {
    if (!user?.id) {
      setTeacherClassName(null);
      return;
    }

    // If teacher has multiple classes, show selector
    if (!classesLoading && accessibleClasses.length > 1 && !selectedClassId) {
      setShowClassSelector(true);
      return;
    }

    // If only one class or class is selected, fetch its name
    const classIdToUse = selectedClassId || accessibleClasses[0]?.class_id;
    
    if (!classIdToUse) {
      setTeacherClassName(null);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("class_name")
        .eq("id", classIdToUse)
        .maybeSingle();

      if (!error && data) {
        setTeacherClassName(data.class_name);
      }
    })();
  }, [user?.id, accessibleClasses, classesLoading, selectedClassId]);

  // Calculate time-based active groups
  const fetchTimeBasedGroups = useMemo(() => async () => {
    if (!runId || !planId || !dismissalTime || !user?.id) {
      setGroups([]);
      setLoadingGroups(false);
      return;
    }

    setLoadingGroups(true);

    try {
      // Get teacher's class and students (use selected class or first accessible class)
      const classIdToUse = selectedClassId || accessibleClasses[0]?.class_id;
      
      let teacherStudentIds: string[] = [];
      if (classIdToUse) {
        const { data: roster } = await supabase
          .from("class_rosters")
          .select("student_id")
          .eq("class_id", classIdToUse);
        
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
        
        // Check if this group should be shown based on time window
        // For Transportation View, show ALL groups from dismissal start
        // For other layouts, keep the time window filter (5 min before, 60 min after)
        const timeDiff = scheduledReleaseTime.getTime() - now.getTime();
        const isWithinTimeWindow = timeDiff <= 5 * 60000 && timeDiff >= -60 * 60000;
        const shouldShowGroup = inTestingMode || 
                                layout === 'transportation-view' || 
                                isWithinTimeWindow || 
                                scheduledReleaseTime <= now;

        if (!shouldShowGroup) continue;

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
              .select("id, bus_number, driver_first_name, driver_last_name")
              .in("id", busIds)
              .eq("school_id", schoolId ?? -1);

            const { data: busEvents } = await supabase
              .from("bus_run_events")
              .select("bus_id, check_in_time, departed_at")
              .eq("dismissal_run_id", runId)
              .in("bus_id", busIds);

            buses = (busDetails || []).map(bus => ({
              id: bus.id,
              bus_number: bus.bus_number,
              driver_name: `${bus.driver_first_name} ${bus.driver_last_name}`,
              checked_in: (busEvents || []).some(event => event.bus_id === bus.id && event.check_in_time),
              departed: (busEvents || []).some(event => event.bus_id === bus.id && event.departed_at)
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

            // Get dismissal group capacity settings
            const { data: groupDetails } = await supabase
              .from("dismissal_groups")
              .select("car_rider_capacity, car_rider_type")
              .eq("id", group.id)
              .single();

            console.log('[ClassroomMode] Car group:', group.name, 'groupCarLines:', groupCarLines, 'group.id:', group.id, 'capacity:', groupDetails?.car_rider_capacity, 'type:', groupDetails?.car_rider_type);

            if (groupCarLines && groupCarLines.length > 0) {
              const carLineIds = groupCarLines.map(gc => gc.car_line_id);
              
              // Get car line assignments for teacher's students
              const { data: carAssignments } = await supabase
                .from("student_car_assignments")
                .select("student_id, car_line_id")
                .in("student_id", teacherStudentIds)
                .in("car_line_id", carLineIds);

              console.log('[ClassroomMode] Car assignments:', carAssignments?.length || 0, 'for teacherStudentIds:', teacherStudentIds.length, 'carLineIds:', carLineIds);

              // Get active car line sessions for this run
              const { data: activeSessions } = await supabase
                .from("car_line_sessions")
                .select("id, car_line_id")
                .eq("dismissal_run_id", runId)
                .in("car_line_id", carLineIds)
                .is("finished_at", null);

              // Get pickup statuses for teacher's students
              let carLinePickups: any[] = [];
              if (activeSessions && activeSessions.length > 0) {
                const sessionIds = activeSessions.map(s => s.id);
                const { data: pickups } = await supabase
                  .from("car_line_pickups")
                  .select("student_id, status, parent_arrived_at, picked_up_at")
                  .in("car_line_session_id", sessionIds)
                  .in("student_id", teacherStudentIds);
                
                carLinePickups = pickups || [];
              }

              const pickupStatusMap = new Map(
                carLinePickups.map(p => [p.student_id, p])
              );

              // Get car line names
              const { data: carLineDetails } = await supabase
                .from("car_lines")
                .select("id, line_name")
                .in("id", carLineIds);

              const carLineNameMap = new Map((carLineDetails || []).map(cl => [cl.id, cl.line_name]));

              // Filter students based on car_rider_type
              const allCarStudents = (carAssignments || [])
                .map(ca => {
                  const student = studentMap.get(ca.student_id);
                  const pickupStatus = pickupStatusMap.get(ca.student_id);
                  if (!student) return null;
                  return {
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    destination: carLineNameMap.get(ca.car_line_id) || 'Car Line',
                    pickupStatus: pickupStatus?.status || 'waiting',
                    hasParentArrived: pickupStatus && (pickupStatus.status === 'parent_arrived' || pickupStatus.status === 'picked_up')
                  };
                })
                .filter((s): s is NonNullable<typeof s> => s !== null);

              // Apply capacity filtering based on car_rider_type
              if (groupDetails?.car_rider_type === 'count' && groupDetails?.car_rider_capacity) {
                // Only show students marked "Parent Here" up to capacity
                students = allCarStudents
                  .filter(s => s.hasParentArrived)
                  .slice(0, groupDetails.car_rider_capacity);
              } else if (groupDetails?.car_rider_type === 'all_remaining') {
                // Show all students (overflow or remaining)
                students = allCarStudents;
              } else {
                // Default: show all assigned students
                students = allCarStudents;
              }
              
              console.log('[ClassroomMode] Car students found:', students.length, 'for group:', group.name, '(filtered by type:', groupDetails?.car_rider_type, ')');
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
      // Get group capacity settings to determine completion logic
      const { data: groupDetails } = await supabase
        .from("dismissal_groups")
        .select("car_rider_capacity, car_rider_type")
        .eq("id", groupId)
        .single();

      if (groupDetails?.car_rider_type === 'count' && groupDetails?.car_rider_capacity) {
        // For capacity groups, check if capacity number of students have been picked up
        const { data: carLineSessions } = await supabase
          .from("car_line_sessions")
          .select("id")
          .eq("dismissal_run_id", runId)
          .in("car_line_id", groupCarLines.map(gc => gc.car_line_id))
          .is("finished_at", null);

        if (carLineSessions && carLineSessions.length > 0) {
          const sessionIds = carLineSessions.map(s => s.id);
          const { data: pickups, count } = await supabase
            .from("car_line_pickups")
            .select("*", { count: 'exact' })
            .in("car_line_session_id", sessionIds)
            .eq("status", "picked_up");

          if ((count || 0) >= groupDetails.car_rider_capacity) {
            return true;
          }
        }
      } else {
        // For "all_remaining" groups, check if sessions are finished
        const { data: carLineSessions } = await supabase
          .from("car_line_sessions")
          .select("finished_at")
          .eq("dismissal_run_id", runId)
          .in("car_line_id", groupCarLines.map(gc => gc.car_line_id));

        const allFinished = (carLineSessions || []).every(session => session.finished_at);
        if (allFinished) return true;
      }
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
        table: "car_line_pickups",
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

  const handleLayoutChange = (newLayout: 'group-view' | 'student-view' | 'transportation-view') => {
    setLayout(newLayout);
    localStorage.setItem('classroom-layout', newLayout);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Class Selector Dialog - shows if teacher has multiple classes */}
      {showClassSelector && accessibleClasses.length > 1 && (
        <Dialog open={showClassSelector} onOpenChange={setShowClassSelector}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Class to Monitor</DialogTitle>
              <DialogDescription>
                You have access to multiple classes today. Choose which class you'd like to monitor for dismissal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {accessibleClasses.map((cls) => (
                <Button
                  key={cls.class_id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => {
                    setSelectedClassId(cls.class_id);
                    setTeacherClassName(cls.class_name);
                    setShowClassSelector(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="font-semibold">{cls.class_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {cls.grade_level} • {cls.is_permanent ? 'Your class' : 'Coverage'}
                    </div>
                    {cls.coverage_notes && (
                      <div className="text-xs text-muted-foreground italic mt-1">
                        Note: {cls.coverage_notes}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Classroom Dismissal</h1>
            <p className="text-muted-foreground mt-1">
              {teacherClassName ? `${teacherClassName} - ` : ''}
              {planName || 'Today\'s Dismissal'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ClassroomModeLayoutToggle
              currentLayout={layout}
              onLayoutChange={handleLayoutChange}
            />
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="text-2xl font-bold">
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
        </div>

        {run && !planId && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              No dismissal plan assigned for today. Please set a date-specific plan or mark a default plan in Dismissal Plans.
            </AlertDescription>
          </Alert>
        )}

        {isLoading || loadingGroups ? (
          <div className="flex items-center gap-2 text-muted-foreground justify-center py-12">
            <Loader2 className="animate-spin" />
            Loading dismissal groups...
          </div>
        ) : layout === 'transportation-view' ? (
          <TransportationColumnsLayout
            groups={groups}
            currentTime={currentTime}
          />
        ) : (
          <GroupViewLayout
            groups={groups}
            currentTime={currentTime}
            dismissalPlanName={planName || undefined}
          />
        )}

        <div className="mt-8 flex justify-center">
          <ExitModeButton label="Exit Classroom Mode" inHeader />
        </div>
      </div>
    </div>
  );
}