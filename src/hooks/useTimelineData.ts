import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'run_start' | 'run_end' | 'bus_checkin' | 'bus_departure' | 'bus_manual_completion' | 'car_session_start' | 'car_session_end' | 'walker_session_start' | 'walker_session_end';
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

      const events: TimelineEvent[] = [];

      // Fetch starter user profile
      const { data: starterProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", dismissalRun.started_by)
        .single();

      // Add dismissal run start event
      events.push({
        id: `run_start_${dismissalRun.id}`,
        timestamp: dismissalRun.started_at,
        type: 'run_start',
        title: 'Dismissal Run Started',
        description: 'Daily dismissal process initiated',
        user_name: starterProfile 
          ? `${starterProfile.first_name} ${starterProfile.last_name}`
          : 'Unknown User',
        icon: 'play'
      });

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