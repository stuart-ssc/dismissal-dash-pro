import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useImpersonation } from './useImpersonation';

export type ActivityType = 'dismissal' | 'absence' | 'coverage' | 'mode_usage' | 'system';

export interface DetailedAuditEvent {
  id: string;
  timestamp: string;
  activityType: ActivityType;
  action: string;
  studentName?: string;
  teacherName?: string;
  details: string;
  performedBy: string;
  performedByName?: string;
  metadata?: Record<string, any>;
}

interface UseDetailedAuditDataParams {
  date: Date;
  activityTypes: ActivityType[];
  searchQuery: string;
}

export function useDetailedAuditData({ date, activityTypes, searchQuery }: UseDetailedAuditDataParams) {
  const { user } = useAuth();
  const { impersonatedSchoolId } = useImpersonation();
  const [events, setEvents] = useState<DetailedAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAuditData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get the user's school ID
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to fetch profile data');
          setIsLoading(false);
          return;
        }

        const effectiveSchoolId = impersonatedSchoolId || profile?.school_id;

        if (!effectiveSchoolId) {
          setEvents([]);
          setIsLoading(false);
          return;
        }

        const dateStr = date.toISOString().split('T')[0];
        const allEvents: DetailedAuditEvent[] = [];

        // Fetch audit logs
        const { data: auditLogs, error: auditError } = await supabase
          .from('audit_logs')
          .select(`
            id,
            timestamp,
            action,
            table_name,
            record_id,
            user_id,
            details,
            profiles:user_id (first_name, last_name)
          `)
          .gte('timestamp', `${dateStr}T00:00:00`)
          .lte('timestamp', `${dateStr}T23:59:59`)
      .order('timestamp', { ascending: false });

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
    }

        // Process audit logs
        if (auditLogs) {
          for (const log of auditLogs) {
            const profile = log.profiles as any;
            const performedByName = profile ? `${profile.first_name} ${profile.last_name}` : 'System';
            
            let activityType: ActivityType = 'system';
            let details = '';
            let studentName = '';
            let teacherName = '';

            // Categorize by action type
            if (log.action.includes('ABSENCE')) {
              activityType = 'absence';
              const logDetails = log.details as any;
              studentName = logDetails?.studentName || '';
              
              if (log.action === 'ABSENCE_MARKED') {
                details = `Marked absent${logDetails?.reason ? ` - ${logDetails.reason}` : ''}`;
              } else if (log.action === 'ABSENCE_RETURNED') {
                details = 'Marked as returned to school';
              } else if (log.action === 'ABSENCE_DELETED') {
                details = 'Absence record deleted';
              }
            } else if (log.action.includes('DISMISSAL')) {
              activityType = 'dismissal';
              details = log.action.replace(/_/g, ' ').toLowerCase();
            } else if (log.action.includes('STUDENT')) {
              activityType = 'dismissal';
              details = log.action.replace(/_/g, ' ').toLowerCase();
            }

            allEvents.push({
              id: log.id,
              timestamp: log.timestamp,
              activityType,
              action: log.action,
              studentName,
              teacherName,
              details,
              performedBy: log.user_id || 'system',
              performedByName,
              metadata: log.details as any
            });
          }
        }

        // Fetch mode sessions
        const { data: modeSessions, error: modeError } = await supabase
          .from('mode_sessions')
          .select(`
            id,
            started_at,
            ended_at,
            mode_type,
            location_name,
            session_duration_seconds,
            user_id,
            profiles:user_id (first_name, last_name)
          `)
          .eq('school_id', effectiveSchoolId)
          .gte('started_at', `${dateStr}T00:00:00`)
          .lte('started_at', `${dateStr}T23:59:59`)
      .order('started_at', { ascending: false });

    if (modeError) {
      console.error('Error fetching mode sessions:', modeError);
    }

        if (modeSessions) {
          for (const session of modeSessions) {
            const profile = session.profiles as any;
            const teacherName = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
            const duration = session.session_duration_seconds 
              ? `${Math.round(session.session_duration_seconds / 60)} minutes`
              : 'In progress';

            allEvents.push({
              id: session.id,
              timestamp: session.started_at,
              activityType: 'mode_usage',
              action: `${session.mode_type}_MODE_STARTED`,
              teacherName,
              details: `${session.mode_type.replace('_', ' ')} Mode${session.location_name ? ` at ${session.location_name}` : ''} - Duration: ${duration}`,
              performedBy: session.user_id,
              performedByName: teacherName,
              metadata: { duration: session.session_duration_seconds }
            });
          }
        }

        // Fetch student absences for the day
        const { data: absences, error: absenceError } = await supabase
          .from('student_absences')
          .select(`
            id,
            created_at,
            start_date,
            end_date,
            absence_type,
            reason,
            marked_by,
            returned_at,
            returned_by,
            students (first_name, last_name),
            marker:marked_by (first_name, last_name),
            returner:returned_by (first_name, last_name)
          `)
          .or(`start_date.eq.${dateStr},and(start_date.lte.${dateStr},end_date.gte.${dateStr})`)
      .order('created_at', { ascending: false });

    if (absenceError) {
      console.error('Error fetching absences:', absenceError);
    }

        if (absences) {
          for (const absence of absences) {
            const student = absence.students as any;
            const marker = absence.marker as any;
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
            const markerName = marker ? `${marker.first_name} ${marker.last_name}` : 'System';

            allEvents.push({
              id: `absence-${absence.id}`,
              timestamp: absence.created_at,
              activityType: 'absence',
              action: 'ABSENCE_MARKED',
              studentName,
              details: `Marked absent${absence.reason ? ` - ${absence.reason}` : ''}`,
              performedBy: absence.marked_by || 'system',
              performedByName: markerName,
              metadata: { absenceType: absence.absence_type, startDate: absence.start_date, endDate: absence.end_date }
            });

            if (absence.returned_at && absence.returned_by) {
              const returner = absence.returner as any;
              const returnerName = returner ? `${returner.first_name} ${returner.last_name}` : 'System';
              
              allEvents.push({
                id: `absence-return-${absence.id}`,
                timestamp: absence.returned_at,
                activityType: 'absence',
                action: 'ABSENCE_RETURNED',
                studentName,
                details: 'Marked as returned to school',
                performedBy: absence.returned_by,
                performedByName: returnerName
              });
            }
          }
        }

        // Fetch class coverage for the day
        const { data: coverage, error: coverageError } = await supabase
          .from('class_coverage')
          .select(`
            id,
            created_at,
            coverage_date,
            notes,
            class:class_id (class_name, room_number),
            covering_teacher:covering_teacher_id (first_name, last_name),
            assigner:assigned_by (first_name, last_name)
          `)
          .eq('coverage_date', dateStr)
      .order('created_at', { ascending: false });

    if (coverageError) {
      console.error('Error fetching class coverage:', coverageError);
    }

        if (coverage) {
          for (const cov of coverage) {
            const classInfo = cov.class as any;
            const coveringTeacher = cov.covering_teacher as any;
            const assigner = cov.assigner as any;
            const className = classInfo ? `${classInfo.class_name}${classInfo.room_number ? ` (Room ${classInfo.room_number})` : ''}` : 'Unknown';
            const teacherName = coveringTeacher ? `${coveringTeacher.first_name} ${coveringTeacher.last_name}` : 'Unknown';
            const assignerName = assigner ? `${assigner.first_name} ${assigner.last_name}` : 'System';

            allEvents.push({
              id: `coverage-${cov.id}`,
              timestamp: cov.created_at,
              activityType: 'coverage',
              action: 'CLASS_COVERAGE_ASSIGNED',
              teacherName,
              details: `Coverage assigned for ${className}${cov.notes ? ` - ${cov.notes}` : ''}`,
              performedBy: assigner?.id || 'system',
              performedByName: assignerName,
              metadata: { className, coverageDate: cov.coverage_date }
            });
          }
        }

        // Fetch dismissal run events for the day
        const { data: dismissalRuns, error: runError } = await supabase
          .from('dismissal_runs')
          .select('id, started_at, ended_at, status, started_by, profiles:started_by (first_name, last_name)')
          .eq('school_id', effectiveSchoolId)
          .eq('date', dateStr);

        if (runError) {
          console.error('Error fetching dismissal runs:', runError);
        }

        if (dismissalRuns && dismissalRuns.length > 0) {
          for (const run of dismissalRuns) {
            const profile = run.profiles as any;
            const starterName = profile ? `${profile.first_name} ${profile.last_name}` : 'System';

            allEvents.push({
              id: `dismissal-start-${run.id}`,
              timestamp: run.started_at,
              activityType: 'dismissal',
              action: 'DISMISSAL_STARTED',
              details: 'Dismissal run started',
              performedBy: run.started_by || 'system',
              performedByName: starterName
            });

            if (run.ended_at) {
              allEvents.push({
                id: `dismissal-end-${run.id}`,
                timestamp: run.ended_at,
                activityType: 'dismissal',
                action: 'DISMISSAL_COMPLETED',
                details: 'Dismissal run completed',
                performedBy: 'system',
                performedByName: 'System'
              });
            }
          }
        }

        // Fetch car line pickup events
        const { data: carLinePickups, error: carLineError } = await supabase
          .from('car_line_pickups')
          .select(`
            id,
            picked_up_at,
            student:student_id (first_name, last_name),
            manager:managed_by (first_name, last_name),
            car_line_sessions!inner (
              dismissal_run_id,
              dismissal_runs!inner (date, school_id)
            )
          `)
          .eq('car_line_sessions.dismissal_runs.school_id', effectiveSchoolId)
          .eq('car_line_sessions.dismissal_runs.date', dateStr)
      .not('picked_up_at', 'is', null)
      .order('picked_up_at', { ascending: false });

    if (carLineError) {
      console.error('Error fetching car line pickups:', carLineError);
    }

        if (carLinePickups) {
          for (const pickup of carLinePickups) {
            const student = pickup.student as any;
            const manager = pickup.manager as any;
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
            const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Unknown';

            allEvents.push({
              id: `car-line-${pickup.id}`,
              timestamp: pickup.picked_up_at!,
              activityType: 'dismissal',
              action: 'CAR_LINE_PICKUP',
              studentName,
              details: 'Picked up in car line',
              performedBy: manager?.id || 'system',
              performedByName: managerName
            });
          }
        }

        // Fetch bus loading events
        const { data: busLoadings, error: busError } = await supabase
          .from('bus_student_loading_events')
          .select(`
            id,
            loaded_at,
            student:student_id (first_name, last_name),
            loader:loaded_by (first_name, last_name),
            bus:bus_id (bus_number),
            dismissal_runs!inner (date, school_id)
          `)
          .eq('dismissal_runs.school_id', effectiveSchoolId)
          .eq('dismissal_runs.date', dateStr)
          .order('loaded_at', { ascending: false });

        if (busError) {
          console.error('Error fetching bus loading events:', busError);
        }

        if (busLoadings) {
          for (const loading of busLoadings) {
            const student = loading.student as any;
            const loader = loading.loader as any;
            const bus = loading.bus as any;
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
            const loaderName = loader ? `${loader.first_name} ${loader.last_name}` : 'Unknown';
            const busNumber = bus?.bus_number || 'Unknown';

            allEvents.push({
              id: `bus-loading-${loading.id}`,
              timestamp: loading.loaded_at,
              activityType: 'dismissal',
              action: 'BUS_STUDENT_LOADED',
              studentName,
              details: `Loaded on Bus #${busNumber}`,
              performedBy: loader?.id || 'system',
              performedByName: loaderName,
              metadata: { busNumber }
            });
          }
        }

        // Fetch walker dismissal events
        const { data: walkerPickups, error: walkerError } = await supabase
          .from('walker_pickups')
          .select(`
            id,
            left_at,
            student:student_id (first_name, last_name),
            manager:managed_by (first_name, last_name),
            walker_sessions!inner (
              walker_location:walker_location_id (location_name),
              dismissal_run_id,
              dismissal_runs!inner (date, school_id)
            )
          `)
          .eq('walker_sessions.dismissal_runs.school_id', effectiveSchoolId)
          .eq('walker_sessions.dismissal_runs.date', dateStr)
      .not('left_at', 'is', null)
      .order('left_at', { ascending: false });

    if (walkerError) {
      console.error('Error fetching walker pickups:', walkerError);
    }

        if (walkerPickups) {
          for (const pickup of walkerPickups) {
            const student = pickup.student as any;
            const manager = pickup.manager as any;
            const walkerSessions = pickup.walker_sessions as any;
            const location = walkerSessions?.walker_location as any;
            const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
            const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Unknown';
            const locationName = location?.location_name || 'Unknown Location';

            allEvents.push({
              id: `walker-${pickup.id}`,
              timestamp: pickup.left_at!,
              activityType: 'dismissal',
              action: 'WALKER_DISMISSED',
              studentName,
              details: `Dismissed from ${locationName}`,
              performedBy: manager?.id || 'system',
              performedByName: managerName,
              metadata: { locationName }
            });
          }
        }

        // Sort all events by timestamp (most recent first)
        allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply filters
        let filteredEvents = allEvents;

        // Filter by activity type
        if (activityTypes.length > 0) {
          filteredEvents = filteredEvents.filter(event => activityTypes.includes(event.activityType));
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredEvents = filteredEvents.filter(event =>
            event.studentName?.toLowerCase().includes(query) ||
            event.teacherName?.toLowerCase().includes(query) ||
            event.performedByName?.toLowerCase().includes(query) ||
            event.details.toLowerCase().includes(query)
          );
        }

        setEvents(filteredEvents);
      } catch (err) {
        console.error('Error fetching audit data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch audit data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditData();
  }, [user, impersonatedSchoolId, date, activityTypes, searchQuery]);

  return { events, isLoading, error };
}
