import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMultiSchool } from "@/hooks/useMultiSchool";

type TeacherClass = {
  class_id: string;
  class_name: string;
  grade_level: string;
  is_permanent: boolean;
  coverage_notes?: string;
};

export const useTeacherClasses = (targetDate?: string) => {
  const { user } = useAuth();
  const { activeSchoolId } = useMultiSchool();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) {
        setClasses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const date = targetDate || new Date().toISOString().split('T')[0];
        
        // Use the helper function to get all accessible classes
        const { data, error: rpcError } = await supabase.rpc(
          'get_teacher_accessible_classes',
          {
            teacher_uuid: user.id,
            target_date: date
          }
        );

        if (rpcError) throw rpcError;

        // Filter by activeSchoolId if user has multiple schools
        const filteredData = activeSchoolId && data
          ? data.filter((c: any) => {
              // Note: We'd need school_id on classes table or join to filter properly
              // For now, trust RPC function which uses RLS
              return true;
            })
          : data;

        setClasses(filteredData || []);
      } catch (e: any) {
        console.error("Error fetching teacher classes:", e);
        setError(e?.message ?? "Failed to fetch classes");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user, targetDate, activeSchoolId]);

  return { classes, loading, error };
};
