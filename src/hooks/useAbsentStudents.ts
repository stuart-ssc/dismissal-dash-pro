import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiSchool } from "@/hooks/useMultiSchool";

/**
 * Hook to fetch and monitor absent student IDs for a given date
 * Returns a Set of student IDs that are marked as absent (and not returned)
 */
export function useAbsentStudents(date: string = new Date().toISOString().split('T')[0]) {
  const { activeSchoolId } = useMultiSchool();
  const [absentStudentIds, setAbsentStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAbsentStudents = async () => {
      if (!activeSchoolId) {
        setAbsentStudentIds(new Set());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('student_absences')
          .select('student_id, students!inner(school_id)')
          .is('returned_at', null) // Only students who haven't returned
          .eq('students.school_id', activeSchoolId)
          .or(`and(absence_type.eq.single_date,start_date.eq.${date}),and(absence_type.eq.date_range,start_date.lte.${date},end_date.gte.${date})`);

        if (error) {
          console.error('Error fetching absent students:', error);
          setAbsentStudentIds(new Set());
        } else {
          const ids = new Set((data || []).map(absence => absence.student_id));
          setAbsentStudentIds(ids);
        }
      } catch (err) {
        console.error('Exception fetching absent students:', err);
        setAbsentStudentIds(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchAbsentStudents();

    // Set up real-time subscription for absence changes
    const channel = supabase
      .channel('student_absences_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_absences'
        },
        () => {
          // Refetch when absences change
          fetchAbsentStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, activeSchoolId]);

  return { absentStudentIds, loading };
}
