import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { format, subDays } from "date-fns";

interface DismissalRun {
  id: string;
  date: string;
  scheduled_start_time: string | null;
  ended_at: string | null;
  status: string;
  car_line_completed_at: string | null;
  walker_completed_at: string | null;
  bus_completed_at: string | null;
  academic_session_id: string | null;
}

interface ChartDataPoint {
  date: string;
  duration: number;
}

interface DismissalLogsData {
  data: DismissalRun[];
  totalCount: number;
}

interface ReportsDataParams {
  dateRangeDays: number;
  currentPage: number;
  itemsPerPage: number;
  sessionId?: string | null;
  compareSessionId?: string | null;
}

export function useReportsData({
  dateRangeDays,
  currentPage,
  itemsPerPage,
  sessionId,
  compareSessionId
}: ReportsDataParams) {
  const { user } = useAuth();
  const { impersonatedSchoolId } = useImpersonation();
  const { activeSchoolId } = useMultiSchool();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [compareChartData, setCompareChartData] = useState<ChartDataPoint[]>([]);
  const [dismissalLogs, setDismissalLogs] = useState<DismissalLogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Determine school ID with priority
        let schoolId = impersonatedSchoolId;
        
        // Priority 2: Use active school from multi-school context
        if (!schoolId && activeSchoolId) {
          schoolId = activeSchoolId;
        }
        
        // Priority 3: Fallback to profile
        if (!schoolId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single();
          
          schoolId = profile?.school_id;
        }

        if (!schoolId) {
          throw new Error('No school ID found');
        }

        const startDate = format(subDays(new Date(), dateRangeDays), 'yyyy-MM-dd');

        // Build base query for chart data
        let chartQuery = supabase
          .from('dismissal_runs')
          .select('date, scheduled_start_time, ended_at, status, academic_session_id')
          .eq('school_id', schoolId)
          .eq('status', 'completed')
          .not('ended_at', 'is', null)
          .not('scheduled_start_time', 'is', null)
          .gte('date', startDate)
          .order('date', { ascending: true });

        // Apply session filter for main chart
        if (sessionId) {
          chartQuery = chartQuery.eq('academic_session_id', sessionId);
        }

        const { data: chartRuns, error: chartError } = await chartQuery;
        if (chartError) throw chartError;

        // Process chart data
        const processedChartData = chartRuns?.map((run) => {
          const startTime = new Date(run.scheduled_start_time!);
          const endTime = new Date(run.ended_at!);
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          
          return {
            date: format(new Date(run.date), 'M/d'),
            duration
          };
        }) || [];

        setChartData(processedChartData);

        // Fetch comparison data if compareSessionId is provided
        if (compareSessionId) {
          let compareQuery = supabase
            .from('dismissal_runs')
            .select('date, scheduled_start_time, ended_at, status, academic_session_id')
            .eq('school_id', schoolId)
            .eq('status', 'completed')
            .eq('academic_session_id', compareSessionId)
            .not('ended_at', 'is', null)
            .not('scheduled_start_time', 'is', null)
            .order('date', { ascending: true })
            .limit(dateRangeDays);

          const { data: compareRuns, error: compareError } = await compareQuery;
          if (compareError) throw compareError;

          const processedCompareData = compareRuns?.map((run) => {
            const startTime = new Date(run.scheduled_start_time!);
            const endTime = new Date(run.ended_at!);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            
            return {
              date: format(new Date(run.date), 'M/d'),
              duration
            };
          }) || [];

          setCompareChartData(processedCompareData);
        } else {
          setCompareChartData([]);
        }

        // Build query for total count
        let countQuery = supabase
          .from('dismissal_runs')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .order('date', { ascending: false });

        if (sessionId) {
          countQuery = countQuery.eq('academic_session_id', sessionId);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // Fetch paginated dismissal logs
        const offset = (currentPage - 1) * itemsPerPage;
        let logsQuery = supabase
          .from('dismissal_runs')
          .select(`
            id,
            date,
            scheduled_start_time,
            ended_at,
            status,
            car_line_completed_at,
            walker_completed_at,
            bus_completed_at,
            academic_session_id
          `)
          .eq('school_id', schoolId)
          .order('date', { ascending: false })
          .range(offset, offset + itemsPerPage - 1);

        if (sessionId) {
          logsQuery = logsQuery.eq('academic_session_id', sessionId);
        }

        const { data: logRuns, error: logError } = await logsQuery;
        if (logError) throw logError;

        setDismissalLogs({
          data: logRuns || [],
          totalCount: count || 0
        });

      } catch (err) {
        console.error('Error fetching reports data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, impersonatedSchoolId, activeSchoolId, dateRangeDays, currentPage, itemsPerPage, sessionId, compareSessionId]);

  return {
    chartData,
    compareChartData,
    dismissalLogs,
    isLoading,
    error
  };
}