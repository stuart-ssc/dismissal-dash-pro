import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { History, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface RolloverLog {
  id: string;
  performed_by: string;
  performed_at: string;
  archived_session_name: string;
  new_session_name: string;
  groups_migrated: number;
  groups_selected: number;
  groups_available: number;
  validation_passed: boolean;
  validation_warnings: any[];
  validation_errors: any[];
  metadata: any;
  performer_name?: string;
}

export default function RolloverHistory() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [logs, setLogs] = useState<RolloverLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RolloverLog | null>(null);

  useEffect(() => {
    if (!user) return;

    const isSystemAdmin = userRole === "system_admin";
    const isSchoolAdmin = userRole === "school_admin";

    if (!isSystemAdmin && !isSchoolAdmin) {
      toast.error("Access denied");
      navigate("/admin");
      return;
    }

    fetchRolloverLogs();
  }, [user, userRole, navigate]);

  const fetchRolloverLogs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("year_end_rollover_logs")
        .select(`
          *,
          performer:profiles!year_end_rollover_logs_performed_by_fkey(first_name, last_name)
        `)
        .order("performed_at", { ascending: false });

      if (error) throw error;

      const logsWithNames = data.map((log: any) => ({
        ...log,
        performer_name: log.performer
          ? `${log.performer.first_name} ${log.performer.last_name}`
          : "Unknown User",
      }));

      setLogs(logsWithNames);
    } catch (error: any) {
      console.error("Error fetching rollover logs:", error);
      toast.error("Failed to load rollover history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (log: RolloverLog) => {
    if (!log.validation_passed || log.validation_errors.length > 0) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Issues
        </Badge>
      );
    }
    if (log.validation_warnings.length > 0) {
      return (
        <Badge variant="warning">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Warnings
        </Badge>
      );
    }
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Success
      </Badge>
    );
  };

  return (
    <main className="flex-1 p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/year-end-rollover")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <History className="h-8 w-8" />
                Rollover History
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete audit trail of all year-end rollovers
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rollover Log</CardTitle>
            <CardDescription>
              Historical record of academic year transitions with validation results and migration statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rollover history found</p>
                <p className="text-sm mt-2">
                  Year-end rollovers will be logged here for audit purposes
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.performed_at), "MMM d, yyyy 'at' h:mm a")}
                      </TableCell>
                      <TableCell>{log.performer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">From:</span>{" "}
                            {log.archived_session_name}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">To:</span>{" "}
                            {log.new_session_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.groups_migrated} / {log.groups_selected} migrated
                          <div className="text-xs text-muted-foreground">
                            ({log.groups_available} available)
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedLog && (
          <Card>
            <CardHeader>
              <CardTitle>Rollover Details</CardTitle>
              <CardDescription>
                Detailed information for rollover performed on{" "}
                {format(new Date(selectedLog.performed_at), "MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Migration Statistics</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Groups Available:</dt>
                      <dd className="font-medium">{selectedLog.groups_available}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Groups Selected:</dt>
                      <dd className="font-medium">{selectedLog.groups_selected}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Groups Migrated:</dt>
                      <dd className="font-medium">{selectedLog.groups_migrated}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Session Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Archived Session:</dt>
                      <dd className="font-medium">{selectedLog.archived_session_name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">New Session:</dt>
                      <dd className="font-medium">{selectedLog.new_session_name}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedLog.validation_warnings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Warnings
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedLog.validation_warnings.map((warning: any, i: number) => (
                      <li key={i}>{warning.message || JSON.stringify(warning)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLog.validation_errors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    Validation Errors
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedLog.validation_errors.map((error: any, i: number) => (
                      <li key={i}>{error.message || JSON.stringify(error)}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
