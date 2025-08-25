import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'run_scheduled' | 'run_preparation' | 'run_start' | 'run_end' | 'bus_checkin' | 'bus_departure' | 'bus_manual_completion' | 'bus_completed' | 'car_session_start' | 'car_session_end' | 'car_completed' | 'walker_session_start' | 'walker_session_end' | 'walker_completed';
  title: string;
  description: string;
  user_name?: string;
  icon: string;
  details?: any;
}

export const useTimelineData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["timeline-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's school ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) return [];

      const today = new Date().toISOString().split('T')[0];

      // Fetch today's dismissal run
      const { data: dismissalRun } = await supabase
        .from("dismissal_runs")
        .select("*")
        .eq("school_id", profile.school_id)
        .eq("date", today)
        .single();

      if (!dismissalRun) return [];

      // Fetch all profile data we might need
      const userIds = new Set<string>();
      if (dismissalRun.started_by) userIds.add(dismissalRun.started_by);
      if (dismissalRun.bus_completed_by) userIds.add(dismissalRun.bus_completed_by);
      if (dismissalRun.car_line_completed_by) userIds.add(dismissalRun.car_line_completed_by);
      if (dismissalRun.walker_completed_by) userIds.add(dismissalRun.walker_completed_by);

      const { data: profiles = [] } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", Array.from(userIds));

      const events: TimelineEvent[] = [];

      // Dismissal run events - scheduled time
      if (dismissalRun.scheduled_start_time) {
        events.push({
          id: `run_scheduled_${dismissalRun.id}`,
          timestamp: dismissalRun.scheduled_start_time,
          type: 'run_scheduled',
          title: 'Dismissal Scheduled',
          description: `Dismissal planned for ${new Date(dismissalRun.scheduled_start_time).toLocaleTimeString()}`,
          icon: 'clock'
        });
      }

      // Preparation phase start
      if (dismissalRun.preparation_start_time) {
        events.push({
          id: `run_preparation_${dismissalRun.id}`,
          timestamp: dismissalRun.preparation_start_time,
          type: 'run_preparation',
          title: 'Preparation Phase Started',
          description: 'Pre-staging allowed for all modes',
          icon: 'play'
        });
      }

      // Dismissal active start
      if (dismissalRun.started_at && dismissalRun.status !== 'scheduled') {
        const startProfile = profiles.find(p => p.id === dismissalRun.started_by);
        events.push({
          id: `run_start_${dismissalRun.id}`,
          timestamp: dismissalRun.started_at,
          type: 'run_start',
          title: 'Dismissal Active',
          description: `Dismissal officially started for ${dismissalRun.date}`,
          user_name: startProfile 
            ? `${startProfile.first_name} ${startProfile.last_name}`
            : 'System',
          icon: 'play'
        });
      }

      // Mode completions
      if (dismissalRun.bus_completed_at) {
        const busProfile = profiles.find(p => p.id === dismissalRun.bus_completed_by);
        events.push({
          id: `bus_completed_${dismissalRun.id}`,
          timestamp: dismissalRun.bus_completed_at,
          type: 'bus_completed',
          title: 'Bus Mode Completed',
          description: 'All bus dismissals finished',
          user_name: busProfile 
            ? `${busProfile.first_name} ${busProfile.last_name}`
            : 'Unknown User',
          icon: 'check-circle'
        });
      }

      if (dismissalRun.car_line_completed_at) {
        const carProfile = profiles.find(p => p.id === dismissalRun.car_line_completed_by);
        events.push({
          id: `car_completed_${dismissalRun.id}`,
          timestamp: dismissalRun.car_line_completed_at,
          type: 'car_completed',
          title: 'Car Line Mode Completed',
          description: 'All car line pickups finished',
          user_name: carProfile 
            ? `${carProfile.first_name} ${carProfile.last_name}`
            : 'Unknown User',
          icon: 'check-circle'
        });
      }

      if (dismissalRun.walker_completed_at) {
        const walkerProfile = profiles.find(p => p.id === dismissalRun.walker_completed_by);
        events.push({
          id: `walker_completed_${dismissalRun.id}`,
          timestamp: dismissalRun.walker_completed_at,
          type: 'walker_completed',
          title: 'Walker Mode Completed',
          description: 'All walker dismissals finished',
          user_name: walkerProfile 
            ? `${walkerProfile.first_name} ${walkerProfile.last_name}`
            : 'Unknown User',
          icon: 'check-circle'
        });
      }

      // Add dismissal run end event if completed
      if (dismissalRun.ended_at) {
        events.push({
          id: `run_end_${dismissalRun.id}`,
          timestamp: dismissalRun.ended_at,
          type: 'run_end',
          title: 'Dismissal Run Completed',
          description: 'All dismissal activities finished',
          icon: 'check'
        });
      }

      // Fetch bus events
      const { data: busEvents } = await supabase
        .from("bus_run_events")
        .select("*")
        .eq("dismissal_run_id", dismissalRun.id);

      // Process bus events
      if (busEvents) {
        for (const event of busEvents) {
          // Fetch bus info
          const { data: bus } = await supabase
            .from("buses")
            .select("bus_number")
            .eq("id", event.bus_id)
            .single();

          if (event.check_in_time) {
            // Fetch check-in user profile
            const { data: checkinProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", event.checked_in_by)
              .single();

            events.push({
              id: `bus_checkin_${event.id}`,
              timestamp: event.check_in_time,
              type: 'bus_checkin',
              title: `Bus ${bus?.bus_number || 'Unknown'} Checked In`,
              description: 'Bus arrived and ready for loading',
              user_name: checkinProfile 
                ? `${checkinProfile.first_name} ${checkinProfile.last_name}`
                : 'Unknown User',
              icon: 'bus',
              details: { bus_number: bus?.bus_number || 'Unknown' }
            });
          }

          if (event.departed_at) {
            // Fetch departure user profile
            const { data: departProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", event.departed_by)
              .single();

            // Determine if this was a manual completion (has departed_at but no check_in_time)
            const isManualCompletion = !event.check_in_time;

            events.push({
              id: `bus_departure_${event.id}`,
              timestamp: event.departed_at,
              type: isManualCompletion ? 'bus_manual_completion' : 'bus_departure',
              title: isManualCompletion 
                ? `Bus ${bus?.bus_number || 'Unknown'} Marked Complete`
                : `Bus ${bus?.bus_number || 'Unknown'} Departed`,
              description: isManualCompletion 
                ? 'Bus marked as complete administratively'
                : 'Bus left with students',
              user_name: departProfile 
                ? `${departProfile.first_name} ${departProfile.last_name}`
                : 'Unknown User',
              icon: isManualCompletion ? 'check-circle' : 'bus',
              details: { bus_number: bus?.bus_number || 'Unknown' }
            });
          }
        }
      }

      // Fetch car line sessions
      const { data: carSessions } = await supabase
        .from("car_line_sessions")
        .select("*")
        .eq("dismissal_run_id", dismissalRun.id);

      if (carSessions) {
        for (const session of carSessions) {
          // Fetch car line info
          const { data: carLine } = await supabase
            .from("car_lines")
            .select("line_name")
            .eq("id", session.car_line_id)
            .single();

          // Fetch manager profile
          const { data: managerProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", session.managed_by)
            .single();

          events.push({
            id: `car_start_${session.id}`,
            timestamp: session.arrived_at,
            type: 'car_session_start',
            title: `Car Line Session Started`,
            description: `${carLine?.line_name || 'Car line'} session began`,
            user_name: managerProfile 
              ? `${managerProfile.first_name} ${managerProfile.last_name}`
              : 'Unknown User',
            icon: 'car',
            details: { line_name: carLine?.line_name || 'Unknown' }
          });

          if (session.finished_at) {
            events.push({
              id: `car_end_${session.id}`,
              timestamp: session.finished_at,
              type: 'car_session_end',
              title: `Car Line Session Ended`,
              description: `${carLine?.line_name || 'Car line'} session completed`,
              user_name: managerProfile 
                ? `${managerProfile.first_name} ${managerProfile.last_name}`
                : 'Unknown User',
              icon: 'car',
              details: { line_name: carLine?.line_name || 'Unknown' }
            });
          }
        }
      }

      // Fetch walker sessions
      const { data: walkerSessions } = await supabase
        .from("walker_sessions")
        .select("*")
        .eq("dismissal_run_id", dismissalRun.id);

      if (walkerSessions) {
        for (const session of walkerSessions) {
          // Fetch walker location info
          const { data: walkerLocation } = await supabase
            .from("walker_locations")
            .select("location_name")
            .eq("id", session.walker_location_id)
            .single();

          // Fetch manager profile
          const { data: managerProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", session.managed_by)
            .single();

          events.push({
            id: `walker_start_${session.id}`,
            timestamp: session.arrived_at,
            type: 'walker_session_start',
            title: `Walker Session Started`,
            description: `${walkerLocation?.location_name || 'Walker location'} session began`,
            user_name: managerProfile 
              ? `${managerProfile.first_name} ${managerProfile.last_name}`
              : 'Unknown User',
            icon: 'map-pin',
            details: { location_name: walkerLocation?.location_name || 'Unknown' }
          });

          if (session.finished_at) {
            events.push({
              id: `walker_end_${session.id}`,
              timestamp: session.finished_at,
              type: 'walker_session_end',
              title: `Walker Session Ended`,
              description: `${walkerLocation?.location_name || 'Walker location'} session completed`,
              user_name: managerProfile 
                ? `${managerProfile.first_name} ${managerProfile.last_name}`
                : 'Unknown User',
              icon: 'map-pin',
              details: { location_name: walkerLocation?.location_name || 'Unknown' }
            });
          }
        }
      }

      // Sort events by timestamp
      return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    enabled: !!user?.id,
  });
};