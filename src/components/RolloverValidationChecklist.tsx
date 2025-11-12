import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw
} from "lucide-react";

interface ValidationCheck {
  id: string;
  label: string;
  status: "checking" | "passed" | "failed" | "warning";
  message?: string;
  details?: any;
}

interface RolloverValidationChecklistProps {
  schoolId: number;
  currentSessionId: string;
  currentSessionName: string;
  onValidationComplete: (canProceed: boolean) => void;
}

export function RolloverValidationChecklist({
  schoolId,
  currentSessionId,
  currentSessionName,
  onValidationComplete,
}: RolloverValidationChecklistProps) {
  const [checks, setChecks] = useState<ValidationCheck[]>([
    { id: "active_runs", label: "No active dismissal runs", status: "checking" },
    { id: "pending_runs", label: "No pending special use runs", status: "checking" },
    { id: "groups_assigned", label: "All groups assigned to academic sessions", status: "checking" },
    { id: "runs_assigned", label: "All special use runs assigned to sessions", status: "checking" },
    { id: "students_assigned", label: "All students assigned to academic sessions", status: "checking" },
    { id: "classes_assigned", label: "All classes assigned to academic sessions", status: "checking" },
  ]);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    runValidation();
  }, [schoolId, currentSessionId]);

  const runValidation = async () => {
    setIsValidating(true);
    const updatedChecks = [...checks];

    try {
      // Check 1: No active dismissal runs
      const { data: activeRuns, error: runsError } = await supabase
        .from("dismissal_runs")
        .select("id, status, date")
        .eq("school_id", schoolId)
        .eq("academic_session_id", currentSessionId)
        .in("status", ["scheduled", "preparation", "active"]);

      if (runsError) throw runsError;

      updatedChecks[0] = {
        ...updatedChecks[0],
        status: activeRuns && activeRuns.length > 0 ? "failed" : "passed",
        message: activeRuns && activeRuns.length > 0 
          ? `${activeRuns.length} active dismissal run(s) must be completed first`
          : "No active dismissal runs",
        details: activeRuns,
      };

      // Check 2: No pending special use runs
      const { data: pendingRuns, error: pendingError } = await supabase
        .from("special_use_runs")
        .select("id, run_name, status, run_date")
        .eq("school_id", schoolId)
        .eq("academic_session_id", currentSessionId)
        .in("status", ["scheduled", "outbound_active", "at_destination", "return_active"]);

      if (pendingError) throw pendingError;

      updatedChecks[1] = {
        ...updatedChecks[1],
        status: pendingRuns && pendingRuns.length > 0 ? "failed" : "passed",
        message: pendingRuns && pendingRuns.length > 0
          ? `${pendingRuns.length} pending special use run(s) must be completed or cancelled`
          : "No pending special use runs",
        details: pendingRuns,
      };

      // Check 3: All groups assigned to sessions
      const { count: unassignedGroupsCount, error: groupsError } = await supabase
        .from("special_use_groups")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .is("academic_session_id", null);

      if (groupsError) throw groupsError;

      updatedChecks[2] = {
        ...updatedChecks[2],
        status: unassignedGroupsCount && unassignedGroupsCount > 0 ? "warning" : "passed",
        message: unassignedGroupsCount && unassignedGroupsCount > 0
          ? `${unassignedGroupsCount} group(s) without academic session assignment`
          : "All groups assigned to academic sessions",
        details: { count: unassignedGroupsCount },
      };

      // Check 4: All special use runs assigned to sessions
      const { count: unassignedRunsCount, error: runsAssignError } = await supabase
        .from("special_use_runs")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .is("academic_session_id", null);

      if (runsAssignError) throw runsAssignError;

      updatedChecks[3] = {
        ...updatedChecks[3],
        status: unassignedRunsCount && unassignedRunsCount > 0 ? "warning" : "passed",
        message: unassignedRunsCount && unassignedRunsCount > 0
          ? `${unassignedRunsCount} special use run(s) without academic session assignment`
          : "All special use runs assigned to academic sessions",
        details: { count: unassignedRunsCount },
      };

      // Check 5: All students assigned to sessions
      const { count: unassignedStudentsCount, error: studentsError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .is("academic_session_id", null);

      if (studentsError) throw studentsError;

      updatedChecks[4] = {
        ...updatedChecks[4],
        status: unassignedStudentsCount && unassignedStudentsCount > 0 ? "warning" : "passed",
        message: unassignedStudentsCount && unassignedStudentsCount > 0
          ? `${unassignedStudentsCount} student(s) without academic session assignment`
          : "All students assigned to academic sessions",
        details: { count: unassignedStudentsCount },
      };

      // Check 6: All classes assigned to sessions
      const { count: unassignedClassesCount, error: classesError } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .is("academic_session_id", null);

      if (classesError) throw classesError;

      updatedChecks[5] = {
        ...updatedChecks[5],
        status: unassignedClassesCount && unassignedClassesCount > 0 ? "warning" : "passed",
        message: unassignedClassesCount && unassignedClassesCount > 0
          ? `${unassignedClassesCount} class(es) without academic session assignment`
          : "All classes assigned to academic sessions",
        details: { count: unassignedClassesCount },
      };

      setChecks(updatedChecks);

      // Determine if rollover can proceed
      const hasFailures = updatedChecks.some((check) => check.status === "failed");
      const hasWarnings = updatedChecks.some((check) => check.status === "warning");
      
      // Can proceed if no failures (warnings are okay with user acknowledgment)
      onValidationComplete(!hasFailures);
    } catch (error) {
      console.error("Error running validation:", error);
      // Mark all remaining checks as failed
      setChecks(
        updatedChecks.map((check) =>
          check.status === "checking"
            ? { ...check, status: "failed", message: "Validation error occurred" }
            : check
        )
      );
      onValidationComplete(false);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (status: ValidationCheck["status"]) => {
    switch (status) {
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: ValidationCheck["status"]) => {
    switch (status) {
      case "checking":
        return <Badge variant="outline">Checking...</Badge>;
      case "passed":
        return <Badge className="bg-success/10 text-success border-success/20">Passed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
    }
  };

  const failedChecks = checks.filter((c) => c.status === "failed");
  const warningChecks = checks.filter((c) => c.status === "warning");
  const canProceed = failedChecks.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pre-Rollover Validation</CardTitle>
            <CardDescription>
              Validating system readiness for {currentSessionName} archival
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recheck
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Results */}
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              {getStatusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">{check.label}</span>
                  {getStatusBadge(check.status)}
                </div>
                {check.message && (
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Alerts */}
        {!isValidating && failedChecks.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cannot proceed with rollover.</strong> Please resolve {failedChecks.length}{" "}
              failed check{failedChecks.length !== 1 ? "s" : ""} before continuing.
            </AlertDescription>
          </Alert>
        )}

        {!isValidating && warningChecks.length > 0 && failedChecks.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {warningChecks.length} warning{warningChecks.length !== 1 ? "s" : ""} detected. You
              can proceed, but we recommend reviewing and resolving these issues using the Session
              Assignment tool.
            </AlertDescription>
          </Alert>
        )}

        {!isValidating && canProceed && warningChecks.length === 0 && (
          <Alert className="bg-success/10 border-success/20">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              All validation checks passed. System is ready for year-end rollover.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
