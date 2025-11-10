import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ICSyncControlPanel } from "@/components/ICSyncControlPanel";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ICSyncTabProps {
  schoolId: number | null;
}

export function ICSyncTab({ schoolId }: ICSyncTabProps) {
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (schoolId) {
      fetchSyncLogs();
    }
  }, [schoolId]);

  const fetchSyncLogs = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ic_sync_logs")
        .select("*")
        .eq("school_id", schoolId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDuration = (sync: any) => {
    if (!sync.completed_at) return "In progress...";
    const start = new Date(sync.started_at).getTime();
    const end = new Date(sync.completed_at).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(syncLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = syncLogs.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Control Panel */}
      <ICSyncControlPanel schoolId={schoolId!} onSyncTriggered={fetchSyncLogs} />

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Complete log of all sync operations</CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Teachers</TableHead>
                    <TableHead className="text-right">Classes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((sync) => (
                    <TableRow key={sync.id}>
                      <TableCell className="font-medium">
                        {format(new Date(sync.started_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sync.sync_type === "manual" ? "Manual" : "Scheduled"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(sync.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {getDuration(sync)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <span className="text-green-600">+{sync.students_created}</span>
                          {sync.students_updated > 0 && (
                            <span className="text-blue-600 ml-1">~{sync.students_updated}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <span className="text-green-600">+{sync.teachers_created}</span>
                          {sync.teachers_updated > 0 && (
                            <span className="text-blue-600 ml-1">~{sync.teachers_updated}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          <span className="text-green-600">+{sync.classes_created}</span>
                          {sync.classes_updated > 0 && (
                            <span className="text-blue-600 ml-1">~{sync.classes_updated}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, syncLogs.length)} of {syncLogs.length} syncs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sync history yet</p>
              <p className="text-sm">Trigger a manual sync to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
