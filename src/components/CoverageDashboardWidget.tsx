import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, addDays } from "date-fns";

type CoverageAssignment = {
  id: string;
  class_name: string;
  coverage_date: string;
  notes: string | null;
  assigned_by_name: string;
};

export function CoverageDashboardWidget() {
  const { user } = useAuth();
  const [todayCoverage, setTodayCoverage] = useState<CoverageAssignment[]>([]);
  const [tomorrowCoverage, setTomorrowCoverage] = useState<CoverageAssignment[]>([]);
  const [upcomingCoverage, setUpcomingCoverage] = useState<CoverageAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoverage();
  }, [user]);

  const fetchCoverage = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('class_coverage')
        .select(`
          id,
          coverage_date,
          notes,
          classes(class_name),
          profiles!class_coverage_assigned_by_fkey(first_name, last_name)
        `)
        .eq('covering_teacher_id', user.id)
        .gte('coverage_date', today)
        .lte('coverage_date', nextWeek)
        .order('coverage_date');

      if (error) throw error;

      const assignments: CoverageAssignment[] = (data || []).map((item: any) => ({
        id: item.id,
        class_name: item.classes?.class_name || 'Unknown Class',
        coverage_date: item.coverage_date,
        notes: item.notes,
        assigned_by_name: item.profiles
          ? `${item.profiles.first_name} ${item.profiles.last_name}`
          : 'Unknown',
      }));

      setTodayCoverage(assignments.filter(a => a.coverage_date === today));
      setTomorrowCoverage(assignments.filter(a => a.coverage_date === tomorrow));
      setUpcomingCoverage(assignments.filter(a => 
        a.coverage_date !== today && a.coverage_date !== tomorrow
      ));
    } catch (error) {
      console.error("Error fetching coverage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (todayCoverage.length === 0 && tomorrowCoverage.length === 0 && upcomingCoverage.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Tomorrow's Coverage Alert */}
      {tomorrowCoverage.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Reminder:</strong> You have coverage tomorrow for{' '}
            {tomorrowCoverage.map(c => c.class_name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Today's Coverage */}
      {todayCoverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Today's Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayCoverage.map(coverage => (
              <div key={coverage.id} className="border-l-4 border-primary pl-3">
                <div className="font-semibold">{coverage.class_name}</div>
                <div className="text-sm text-muted-foreground">
                  Assigned by {coverage.assigned_by_name}
                </div>
                {coverage.notes && (
                  <div className="text-sm italic text-muted-foreground mt-1">
                    "{coverage.notes}"
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Coverage */}
      {upcomingCoverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingCoverage.map(coverage => (
              <div key={coverage.id} className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{coverage.class_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(coverage.coverage_date), 'EEEE, MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
