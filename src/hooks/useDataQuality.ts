import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DataQualityMetrics {
  total_students: number;
  students_missing_contact_info: number;
  students_missing_parent_name: number;
  students_missing_ic_id: number;
  students_without_classes: number;
  total_teachers: number;
  teachers_missing_email: number;
  teachers_missing_ic_id: number;
  teachers_without_classes: number;
  teachers_without_accounts: number;
  total_classes: number;
  classes_without_teachers: number;
  classes_without_students: number;
  overall_completeness_score: number;
  data_quality_grade: string;
}

interface DataQualitySnapshot extends DataQualityMetrics {
  id: string;
  school_id: number;
  snapshot_date: string;
  created_at: string;
}

export function useDataQuality(schoolId: number | null) {
  // Fetch latest quality metrics (calculated real-time)
  const { data: currentMetrics, isLoading: isLoadingCurrent, refetch: refetchCurrent } = useQuery({
    queryKey: ['ic-data-quality-current', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_ic_data_quality', { p_school_id: schoolId });
      
      if (error) throw error;
      return data?.[0] as DataQualityMetrics | undefined;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch historical snapshots for trends (last 30 days)
  const { data: historicalMetrics, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['ic-data-quality-history', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ic_data_quality_snapshots')
        .select('*')
        .eq('school_id', schoolId)
        .order('snapshot_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as DataQualitySnapshot[];
    },
    enabled: !!schoolId,
  });

  const isLoading = isLoadingCurrent || isLoadingHistory;

  return {
    currentMetrics,
    historicalMetrics,
    isLoading,
    refetch: refetchCurrent,
  };
}
