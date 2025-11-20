import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { format, subDays } from "date-fns";

interface DismissalRun {
  id: string;
  date: string;
  scheduled_start_time: string | null;
  ended_at: string | null;
  status: string;
  school_id: number;
  academic_session_id: string | null;
}

interface ChartDataPoint {
  date: string;
  duration: number;
}

interface SchoolPerformance {
  school_id: number;
  school_name: string;
  total_dismissals: number;
  avg_duration: number;
  status: 'excellent' | 'good' | 'needs-attention';
}

interface DismissalLog {
  id: string;
  date: string;
  school_id: number;
  school_name: string;
  scheduled_start_time: string | null;
  ended_at: string | null;
  status: string;
  duration: number | null;
}

interface DismissalLogsData {
  data: DismissalLog[];
  totalCount: number;
}

interface SummaryStats {
  totalSchools: number;
  totalDismissals: number;
  avgDuration: number;
  totalStudents: number;
}

interface DistrictReportsDataParams {
  dateRangeDays: number;
  currentPage: number;
  itemsPerPage: number;
  sessionId?: string | null;
  compareSessionId?: string | null;
  schoolFilter?: number | null;
}

export function useDistrictReportsData({
  dateRangeDays,
  currentPage,
  itemsPerPage,
  sessionId,
  compareSessionId,
  schoolFilter
}: DistrictReportsDataParams) {
  const { user } = useAuth();
  const { district } = useDistrictAuth();
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalSchools: 0,
    totalDismissals: 0,
    avgDuration: 0,
    totalStudents: 0
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [compareChartData, setCompareChartData] = useState<ChartDataPoint[]>([]);
  const [schoolPerformance, setSchoolPerformance] = useState<SchoolPerformance[]>([]);
  const [dismissalLogs, setDismissalLogs] = useState<DismissalLogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !district?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const startDate = format(subDays(new Date(), dateRangeDays), 'yyyy-MM-dd');

        // 1. Fetch all schools in district
        const { data: schools, error: schoolsError } = await supabase
          .from('schools')
          .select('id, school_name')
          .eq('district_id', district.id)
          .eq('verification_status', 'verified');

        if (schoolsError) throw schoolsError;
        if (!schools || schools.length === 0) {
          setSummaryStats({ totalSchools: 0, totalDismissals: 0, avgDuration: 0, totalStudents: 0 });
          setChartData([]);
          setSchoolPerformance([]);
          setDismissalLogs({ data: [], totalCount: 0 });
          setIsLoading(false);
          return;
        }

        const schoolIds = schools.map(s => s.id);

        // 2. Fetch total students across all schools
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('school_id', schoolIds);

        // 3. Build query for chart data
        let chartQuery = supabase
          .from('dismissal_runs')
          .select('date, scheduled_start_time, ended_at, status, school_id, academic_session_id')
          .in('school_id', schoolIds)
          .eq('status', 'completed')
          .not('ended_at', 'is', null)
          .not('scheduled_start_time', 'is', null)
          .gte('date', startDate)
          .order('date', { ascending: true });

        if (sessionId) {
          chartQuery = chartQuery.eq('academic_session_id', sessionId);
        }

        const { data: chartRuns, error: chartError } = await chartQuery;
        if (chartError) throw chartError;

        // Process chart data - aggregate by date
        const dateMap = new Map<string, number[]>();
        chartRuns?.forEach((run) => {
          const startTime = new Date(run.scheduled_start_time!);
          const endTime = new Date(run.ended_at!);
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          const dateKey = format(new Date(run.date), 'M/d');
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
          }
          dateMap.get(dateKey)!.push(duration);
        });

        const processedChartData = Array.from(dateMap.entries()).map(([date, durations]) => ({
          date,
          duration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        }));

        setChartData(processedChartData);

        // 4. Fetch comparison data if needed
        if (compareSessionId) {
          let compareQuery = supabase
            .from('dismissal_runs')
            .select('date, scheduled_start_time, ended_at, status, academic_session_id')
            .in('school_id', schoolIds)
            .eq('status', 'completed')
            .eq('academic_session_id', compareSessionId)
            .not('ended_at', 'is', null)
            .not('scheduled_start_time', 'is', null)
            .order('date', { ascending: true })
            .limit(dateRangeDays * schoolIds.length);

          const { data: compareRuns, error: compareError } = await compareQuery;
          if (compareError) throw compareError;

          const compareDateMap = new Map<string, number[]>();
          compareRuns?.forEach((run) => {
            const startTime = new Date(run.scheduled_start_time!);
            const endTime = new Date(run.ended_at!);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            const dateKey = format(new Date(run.date), 'M/d');
            
            if (!compareDateMap.has(dateKey)) {
              compareDateMap.set(dateKey, []);
            }
            compareDateMap.get(dateKey)!.push(duration);
          });

          const processedCompareData = Array.from(compareDateMap.entries()).map(([date, durations]) => ({
            date,
            duration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
          }));

          setCompareChartData(processedCompareData);
        } else {
          setCompareChartData([]);
        }

        // 5. Calculate school performance
        const schoolStats = await Promise.all(
          schools.map(async (school) => {
            let perfQuery = supabase
              .from('dismissal_runs')
              .select('scheduled_start_time, ended_at')
              .eq('school_id', school.id)
              .eq('status', 'completed')
              .not('ended_at', 'is', null)
              .not('scheduled_start_time', 'is', null)
              .gte('date', startDate);

            if (sessionId) {
              perfQuery = perfQuery.eq('academic_session_id', sessionId);
            }

            const { data: runs } = await perfQuery;

            if (!runs || runs.length === 0) {
              return {
                school_id: school.id,
                school_name: school.school_name,
                total_dismissals: 0,
                avg_duration: 0,
                status: 'needs-attention' as const
              };
            }

            const durations = runs.map(run => {
              const startTime = new Date(run.scheduled_start_time!);
              const endTime = new Date(run.ended_at!);
              return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            });

            const avgDuration = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
            
            let status: 'excellent' | 'good' | 'needs-attention' = 'needs-attention';
            if (avgDuration < 20) status = 'excellent';
            else if (avgDuration <= 30) status = 'good';

            return {
              school_id: school.id,
              school_name: school.school_name,
              total_dismissals: runs.length,
              avg_duration: avgDuration,
              status
            };
          })
        );

        setSchoolPerformance(schoolStats);

        // 6. Calculate summary stats
        const totalDismissals = schoolStats.reduce((sum, s) => sum + s.total_dismissals, 0);
        const totalDurationSum = schoolStats.reduce((sum, s) => sum + (s.avg_duration * s.total_dismissals), 0);
        const avgDuration = totalDismissals > 0 ? Math.round(totalDurationSum / totalDismissals) : 0;

        setSummaryStats({
          totalSchools: schools.length,
          totalDismissals,
          avgDuration,
          totalStudents: studentCount || 0
        });

        // 7. Fetch paginated dismissal logs
        const offset = (currentPage - 1) * itemsPerPage;
        let logsQuery = supabase
          .from('dismissal_runs')
          .select('id, date, school_id, scheduled_start_time, ended_at, status', { count: 'exact' })
          .in('school_id', schoolIds)
          .order('date', { ascending: false })
          .range(offset, offset + itemsPerPage - 1);

        if (sessionId) {
          logsQuery = logsQuery.eq('academic_session_id', sessionId);
        }

        if (schoolFilter) {
          logsQuery = logsQuery.eq('school_id', schoolFilter);
        }

        const { data: logRuns, error: logError, count } = await logsQuery;
        if (logError) throw logError;

        // Add school names to logs
        const logsWithSchoolNames = logRuns?.map(run => {
          const school = schools.find(s => s.id === run.school_id);
          let duration = null;
          if (run.scheduled_start_time && run.ended_at) {
            const startTime = new Date(run.scheduled_start_time);
            const endTime = new Date(run.ended_at);
            duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          }

          return {
            ...run,
            school_name: school?.school_name || 'Unknown School',
            duration
          };
        }) || [];

        setDismissalLogs({
          data: logsWithSchoolNames,
          totalCount: count || 0
        });

      } catch (err) {
        console.error('Error fetching district reports data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, district?.id, dateRangeDays, currentPage, itemsPerPage, sessionId, compareSessionId, schoolFilter]);

  return {
    summaryStats,
    chartData,
    compareChartData,
    schoolPerformance,
    dismissalLogs,
    isLoading,
    error
  };
}
