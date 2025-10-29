import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeacherModeActivity {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mode_type: string | null;
  location_name: string | null;
  started_at: string | null;
  session_duration_minutes: number | null;
  is_active: boolean;
}

export function useTeacherModeActivity(schoolId: number | null) {
  const [teachers, setTeachers] = useState<TeacherModeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  const fetchTeacherActivity = async () => {
    if (!schoolId) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    try {
      // Get all teachers and their current mode sessions
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          mode_sessions!inner (
            mode_type,
            location_name,
            started_at,
            ended_at
          )
        `)
        .eq('school_id', schoolId)
        .is('mode_sessions.ended_at', null); // Only active sessions

      if (error) throw error;

      // Get all school users (teachers and admins)
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId);

      if (usersError) throw usersError;

      // Transform data to include active and inactive teachers
      const activityMap = new Map();

      // First, add all active sessions
      data?.forEach((teacher: any) => {
        teacher.mode_sessions.forEach((session: any) => {
          const startTime = new Date(session.started_at);
          const durationMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
          
          activityMap.set(teacher.id, {
            id: teacher.id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
            mode_type: session.mode_type,
            location_name: session.location_name,
            started_at: session.started_at,
            session_duration_minutes: durationMinutes,
            is_active: true,
          });
        });
      });

      // Then add all users without active sessions
      allUsers?.forEach((user: any) => {
        if (!activityMap.has(user.id)) {
          activityMap.set(user.id, {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            mode_type: null,
            location_name: null,
            started_at: null,
            session_duration_minutes: null,
            is_active: false,
          });
        }
      });

      const teachersList = Array.from(activityMap.values());
      const activeTeachers = teachersList.filter(t => t.is_active);

      setTeachers(teachersList);
      setActiveCount(activeTeachers.length);
    } catch (error) {
      console.error('Error fetching teacher activity:', error);
      setTeachers([]);
      setActiveCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherActivity();

    // Set up real-time subscription
    const channel = supabase
      .channel('teacher-mode-activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mode_sessions',
        },
        () => {
          fetchTeacherActivity();
        }
      )
      .subscribe();

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchTeacherActivity, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [schoolId]);

  return {
    teachers,
    loading,
    activeCount,
    refresh: fetchTeacherActivity,
  };
}