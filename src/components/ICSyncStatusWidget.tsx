import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ICSyncStatusWidgetProps {
  schoolId: number;
}

export function ICSyncStatusWidget({ schoolId }: ICSyncStatusWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<any>(null);

  useEffect(() => {
    fetchConnectionStatus();
  }, [schoolId]);

  const fetchConnectionStatus = async () => {
    try {
      setIsLoading(true);

      // Check if IC is connected
      const { data: connection } = await supabase
        .from('ic_connections' as any)
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      setIsConnected(!!connection);

      if (connection) {
        // Fetch the latest sync log
        const { data: syncLog } = await supabase
          .from('ic_sync_logs' as any)
          .select('*')
          .eq('school_id', schoolId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setLastSync(syncLog);
      }
    } catch (error) {
      console.error('Error fetching IC connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      toast.info("Starting Infinite Campus sync...");

      const { data, error } = await supabase.functions.invoke('sync-infinite-campus', {
        body: { schoolId, syncType: 'manual' }
      });

      if (error) throw error;

      // Poll for completion
      const pollForCompletion = setInterval(async () => {
        const { data: syncLog } = await supabase
          .from('ic_sync_logs' as any)
          .select('*')
          .eq('school_id', schoolId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle() as any;

        if (syncLog && syncLog.completed_at) {
          clearInterval(pollForCompletion);
          setIsSyncing(false);
          
          if (syncLog.status === 'completed') {
            toast.success("Sync completed successfully!");
          } else {
            toast.error("Sync completed with errors. Check sync history for details.");
          }
          
          fetchConnectionStatus();
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollForCompletion);
        setIsSyncing(false);
        toast.info("Sync is taking longer than expected. Check sync history for status.");
      }, 300000);

    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error("Failed to start sync. Please try again.");
      setIsSyncing(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (!lastSync) return null;
    
    switch (lastSync.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getLastSyncTime = () => {
    if (!lastSync?.completed_at) return "Never";
    return formatDistanceToNow(new Date(lastSync.completed_at), { addSuffix: true });
  };

  const getSyncStats = () => {
    if (!lastSync?.sync_result) return null;
    
    const stats = lastSync.sync_result;
    return {
      students: stats.students_added + stats.students_updated,
      teachers: stats.teachers_added + stats.teachers_updated,
      classes: stats.classes_added + stats.classes_updated,
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <CardTitle>Infinite Campus Sync</CardTitle>
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Infinite Campus Sync</CardTitle>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        <CardDescription>
          Automatically sync students, teachers, and classes from Infinite Campus
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              {getSyncStatusIcon()}
              <span>Last sync: {getLastSyncTime()}</span>
            </div>

            {getSyncStats() && (
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {getSyncStats()?.students || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {getSyncStats()?.teachers || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Teachers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {getSyncStats()?.classes || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Classes</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSyncNow} 
                disabled={isSyncing}
                size="sm"
              >
                {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sync Now
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/integrations/infinite-campus?tab=sync">
                  View History
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect Infinite Campus to automatically sync students, teachers, and classes.
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/integrations/infinite-campus">Connect IC</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
