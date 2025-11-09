import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  GitMerge,
  Settings,
  TrendingUp,
  Users,
  XCircle,
  Zap,
  ExternalLink,
  RefreshCw,
  FileText,
  Bot,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function ICSyncDashboard() {
  const navigate = useNavigate();
  const { activeSchoolId } = useMultiSchool();

  // Fetch IC connection status
  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ["ic-connection", activeSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infinite_campus_connections")
        .select("*")
        .eq("school_id", activeSchoolId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  // Fetch recent sync logs
  const { data: recentSyncs, isLoading: syncsLoading } = useQuery({
    queryKey: ["recent-syncs", activeSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_sync_logs")
        .select("*")
        .eq("school_id", activeSchoolId)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  // Fetch pending merges statistics
  const { data: pendingMerges, isLoading: mergesLoading } = useQuery({
    queryKey: ["pending-merges-stats", activeSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_pending_merges")
        .select("*")
        .eq("school_id", activeSchoolId)
        .eq("status", "pending");

      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  // Fetch auto-merge rules and their performance
  const { data: autoMergeRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["auto-merge-rules-stats", activeSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_auto_merge_rules")
        .select("*")
        .eq("school_id", activeSchoolId)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  // Fetch audit log for auto-merge performance
  const { data: auditStats, isLoading: auditLoading } = useQuery({
    queryKey: ["auto-merge-audit-stats", activeSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_merge_audit_log")
        .select("auto_approved, auto_approved_by_rule_id, decided_at")
        .eq("school_id", activeSchoolId)
        .gte("decided_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!activeSchoolId,
  });

  // Calculate statistics
  const pendingCount = pendingMerges?.length || 0;
  const studentPending = pendingMerges?.filter((m) => m.record_type === "student").length || 0;
  const teacherPending = pendingMerges?.filter((m) => m.record_type === "teacher").length || 0;
  const highConfidencePending = pendingMerges?.filter((m) => m.match_confidence >= 0.9).length || 0;

  const autoApprovedCount = auditStats?.filter((a) => a.auto_approved).length || 0;
  const manualDecisionCount = auditStats?.filter((a) => !a.auto_approved).length || 0;
  const totalDecisions = autoApprovedCount + manualDecisionCount;
  const autoApprovalRate = totalDecisions > 0 ? (autoApprovedCount / totalDecisions) * 100 : 0;

  const lastSync = recentSyncs?.[0];
  const connectionHealthy = connection?.status === "active" && lastSync?.status === "completed";

  // Calculate rule performance
  const rulePerformance = autoMergeRules?.map((rule) => {
    const approvals = auditStats?.filter((a) => a.auto_approved_by_rule_id === rule.id).length || 0;
    return {
      ...rule,
      approvalCount: approvals,
    };
  });

  const isLoading = connectionLoading || syncsLoading || mergesLoading || rulesLoading || auditLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">IC Sync Dashboard</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Infinite Campus Sync Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor sync health, performance, and manage integrations</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/settings")}>
          ← Back to Settings
        </Button>
      </div>

      {/* Connection Health Alert */}
      {connection ? (
        connectionHealthy ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Connection Healthy</AlertTitle>
            <AlertDescription className="text-green-800">
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
        )
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Connection</AlertTitle>
          <AlertDescription>
            Infinite Campus is not connected yet. Connect to start syncing data.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Merges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Merges</CardTitle>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {studentPending} students, {teacherPending} teachers
            </p>
            {pendingCount > 0 && (
              <Button
                variant="link"
                size="sm"
                className="px-0 mt-2"
                onClick={() => navigate("/dashboard/integrations/ic-pending-merges")}
              >
                Review Now →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Auto-Approval Rate */}
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

        {/* High Confidence Merges */}
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

        {/* Recent Syncs */}
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
              onClick={() => navigate("/dashboard/integrations/ic-sync-history")}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => navigate("/dashboard/integrations/ic-pending-merges")}
              disabled={pendingCount === 0}
            >
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
              onClick={() => navigate("/dashboard/integrations/ic-auto-merge-rules")}
            >
              <Zap className="h-5 w-5 mb-2" />
              <span className="text-sm">Manage Rules</span>
              <span className="text-xs text-muted-foreground mt-1">
                {autoMergeRules?.length || 0} active
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => navigate("/dashboard/integrations/ic-sync-history")}
            >
              <Calendar className="h-5 w-5 mb-2" />
              <span className="text-sm">Sync History</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col py-4"
              onClick={() => navigate("/dashboard/integrations/ic-merge-audit")}
            >
              <FileText className="h-5 w-5 mb-2" />
              <span className="text-sm">Audit Log</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Sync Activity
            </CardTitle>
            <CardDescription>Last 10 sync operations</CardDescription>
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

        {/* Auto-Merge Rule Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Auto-Merge Rule Performance
            </CardTitle>
            <CardDescription>Approvals by rule (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {rulePerformance && rulePerformance.length > 0 ? (
              <div className="space-y-4">
                {rulePerformance.map((rule) => (
                  <div key={rule.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-sm font-medium">{rule.rule_name}</span>
                      </div>
                      <span className="text-sm font-bold">{rule.approvalCount}</span>
                    </div>
                    <Progress
                      value={autoApprovedCount > 0 ? (rule.approvalCount / autoApprovedCount) * 100 : 0}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Priority {rule.priority} • ≥{(rule.min_confidence_score * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No auto-merge rules configured</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate("/dashboard/integrations/ic-auto-merge-rules")}
                >
                  Create your first rule →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Merge Breakdown */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Merge Breakdown</CardTitle>
            <CardDescription>Distribution by confidence and type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">By Record Type</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">{studentPending}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Teachers</span>
                    <span className="font-medium">{teacherPending}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">By Confidence</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">High (≥90%)</span>
                    <span className="font-medium">{highConfidencePending}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other</span>
                    <span className="font-medium">{pendingCount - highConfidencePending}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Match Types</p>
                <div className="space-y-1">
                  {Array.from(
                    new Set(pendingMerges?.map((m) => m.match_criteria).filter(Boolean))
                  ).map((type) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {type.replace("_", " ")}
                      </span>
                      <span className="font-medium">
                        {pendingMerges?.filter((m) => m.match_criteria === type).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Button onClick={() => navigate("/dashboard/integrations/ic-pending-merges")}>
                  Review All Merges →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
