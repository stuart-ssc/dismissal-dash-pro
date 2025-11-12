import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GraduationCap, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SessionHealthWidgetProps {
  schoolId: number;
}

export function SessionHealthWidget({ schoolId }: SessionHealthWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [groupsWithoutSession, setGroupsWithoutSession] = useState(0);
  const [runsWithoutSession, setRunsWithoutSession] = useState(0);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      if (!schoolId) return;

      try {
        setLoading(true);

        // Count groups without academic session
        const { count: groupCount, error: groupError } = await supabase
          .from('special_use_groups')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .is('academic_session_id', null);

        if (groupError) throw groupError;

        // Count runs without academic session
        const { count: runCount, error: runError } = await supabase
          .from('special_use_runs')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .is('academic_session_id', null);

        if (runError) throw runError;

        setGroupsWithoutSession(groupCount || 0);
        setRunsWithoutSession(runCount || 0);
      } catch (error) {
        console.error('Error fetching session health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
  }, [schoolId]);

  const hasIssues = groupsWithoutSession > 0 || runsWithoutSession > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Session Health
          </CardTitle>
          <CardDescription>Checking session assignments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Session Health
        </CardTitle>
        <CardDescription>Academic session assignment status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasIssues ? (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some groups or runs are missing academic session assignments
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="text-2xl font-bold text-destructive">
                  {groupsWithoutSession}
                </div>
                <div className="text-sm text-muted-foreground">
                  Groups without session
                </div>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="text-2xl font-bold text-destructive">
                  {runsWithoutSession}
                </div>
                <div className="text-sm text-muted-foreground">
                  Runs without session
                </div>
              </div>
            </div>

            <Button asChild className="w-full">
              <Link to="/admin/session-assignment">
                Assign Sessions
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
              <GraduationCap className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              All groups and runs have academic sessions assigned
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
