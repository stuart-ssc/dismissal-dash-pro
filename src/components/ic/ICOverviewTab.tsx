import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ICConnectionWizard } from "@/components/ICConnectionWizard";
import {
  CheckCircle,
  Clock,
  GitMerge,
  Settings,
  TrendingUp,
  XCircle,
  RefreshCw,
  Bot,
  Zap,
  Calendar,
  AlertCircle,
  Database,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ICOverviewTabProps {
  connection: any;
  schoolId: number | null;
}

export function ICOverviewTab({ connection, schoolId }: ICOverviewTabProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Fetch recent sync logs
  const { data: recentSyncs } = useQuery({
    queryKey: ["recent-syncs", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_sync_logs")
        .select("*")
        .eq("school_id", schoolId)
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!connection,
  });

  // Fetch pending merges statistics
  const { data: pendingMerges } = useQuery({
    queryKey: ["pending-merges-stats", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_pending_merges")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!connection,
  });

  // Fetch audit stats for auto-merge performance
  const { data: auditStats } = useQuery({
    queryKey: ["auto-merge-audit-stats", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_merge_audit_log")
        .select("auto_approved, decided_at")
        .eq("school_id", schoolId)
        .gte("decided_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId && !!connection,
  });

  const handleWizardComplete = async () => {
    setShowWizard(false);
    await queryClient.invalidateQueries({ queryKey: ['ic-connection', schoolId] });
    toast.success('Infinite Campus connected successfully!');
    setSearchParams({ tab: 'sync' });
  };

  const handleSyncNow = async () => {
    if (!schoolId) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-manual-sync', {
        body: { schoolId }
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success('Sync started successfully');
        await queryClient.invalidateQueries({ queryKey: ['recent-syncs', schoolId] });
      }
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      toast.error(error.message || 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate statistics
  const pendingCount = pendingMerges?.length || 0;
  const highConfidencePending = pendingMerges?.filter((m) => m.match_confidence >= 0.9).length || 0;
  const autoApprovedCount = auditStats?.filter((a) => a.auto_approved).length || 0;
  const manualDecisionCount = auditStats?.filter((a) => !a.auto_approved).length || 0;
  const totalDecisions = autoApprovedCount + manualDecisionCount;
  const autoApprovalRate = totalDecisions > 0 ? (autoApprovedCount / totalDecisions) * 100 : 0;
  const lastSync = recentSyncs?.[0];
  const connectionHealthy = connection?.status === "active" && lastSync?.status === "completed";

  // NO CONNECTION STATE
  if (!connection) {
    return (
      <>
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-2xl">Connect to Infinite Campus</CardTitle>
                <CardDescription className="text-base">
                  Automatically sync students, teachers, and classes from your Infinite Campus SIS
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Automatic Syncing</p>
                  <p className="text-sm text-muted-foreground">
                    Keep your data up-to-date automatically on a schedule
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Real-time Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Changes in IC appear in DismissalPro quickly
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitMerge className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Smart Duplicate Handling</p>
                  <p className="text-sm text-muted-foreground">
                    AI-powered matching prevents duplicate records
                  </p>
                </div>
              </div>
            </div>

            <Button size="lg" onClick={() => setShowWizard(true)} className="w-full">
              Set Up Connection
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You'll need your Infinite Campus OneRoster API credentials from your IT administrator
            </p>
          </CardContent>
        </Card>

        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ICConnectionWizard
              schoolId={schoolId!}
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // CONNECTED STATE
  return (
    <div className="space-y-6">
      {/* Connection Health Alert */}
      {connectionHealthy ? (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">Connection Healthy</AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Infinite Campus integration is active and syncing properly.
            {lastSync && (
              <span className="ml-1">
                Last sync: {formatDistanceToNow(new Date(lastSync.started_at), { addSuffix: true })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>
            {connection.status === "inactive"
              ? "Connection is inactive. Please check your credentials."
              : lastSync?.status === "failed"
              ? "Last sync failed. Check sync history for details."
              : "Unable to determine connection health."}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Merges</CardTitle>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingMerges?.filter(m => m.record_type === 'student').length || 0} students, {pendingMerges?.filter(m => m.record_type === 'teacher').length || 0} teachers
            </p>
            {pendingCount > 0 && (
              <Button
                variant="link"
                size="sm"
                className="px-0 mt-2"
                onClick={() => setSearchParams({ tab: 'merges' })}
              >
                Review Now →
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approval Rate</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoApprovalRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {autoApprovedCount} of {totalDecisions} merges (30d)
            </p>
            <Progress value={autoApprovalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highConfidencePending}</div>
            <p className="text-xs text-muted-foreground">≥90% confidence pending</p>
            {highConfidencePending > 0 && (
              <Badge variant="secondary" className="mt-2">
                Ready for auto-merge
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Syncs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentSyncs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {lastSync
                ? formatDistanceToNow(new Date(lastSync.started_at), { addSuffix: true })
                : "No syncs yet"}
            </p>
            <Button
              variant="link"
              size="sm"
              className="px-0 mt-2"
              onClick={() => setSearchParams({ tab: 'sync' })}
            >
              View History →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Button
              variant="default"
              className="h-auto flex-col py-4"
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-5 w-5 mb-2 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mb-2" />
              )}
              <span className="text-sm">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </Button>
              <GitMerge className="h-5 w-5 mb-2" />
              <span className="text-sm">Review Merges</span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="mt-1">
                  {pendingCount}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => setSearchParams({ tab: 'rules' })}
            >
              <Zap className="h-5 w-5 mb-2" />
              <span className="text-sm">Manage Rules</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => setSearchParams({ tab: 'sync' })}
            >
              <Calendar className="h-5 w-5 mb-2" />
              <span className="text-sm">Sync History</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => setSearchParams({ tab: 'quality' })}
            >
              <CheckCircle className="h-5 w-5 mb-2" />
              <span className="text-sm">Data Quality</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => setSearchParams({ tab: 'settings' })}
            >
              <Settings className="h-5 w-5 mb-2" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Sync Activity
          </CardTitle>
          <CardDescription>Last 5 sync operations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSyncs && recentSyncs.length > 0 ? (
            <div className="space-y-4">
              {recentSyncs.map((sync) => (
                <div key={sync.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className="mt-1">
                    {sync.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : sync.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {sync.sync_type === "manual" ? "Manual Sync" : "Scheduled Sync"}
                      </p>
                      <Badge
                        variant={
                          sync.status === "completed"
                            ? "default"
                            : sync.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {sync.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sync.started_at), "MMM d, yyyy HH:mm")}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        📥 {sync.students_created + sync.teachers_created + sync.classes_created} created
                      </span>
                      <span>
                        ✏️ {sync.students_updated + sync.teachers_updated + sync.classes_updated} updated
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sync activity yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
