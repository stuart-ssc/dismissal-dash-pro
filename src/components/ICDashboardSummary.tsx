import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitMerge, RefreshCw, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ICDashboardSummaryProps {
  schoolId: number | null;
}

interface SyncStatus {
  status: string;
  completed_at: string | null;
  students_created: number;
  students_updated: number;
  teachers_created: number;
  teachers_updated: number;
}

export function ICDashboardSummary({ schoolId }: ICDashboardSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMergesCount, setPendingMergesCount] = useState(0);
  const [autoMergeRulesCount, setAutoMergeRulesCount] = useState(0);
  const [activeRulesCount, setActiveRulesCount] = useState(0);
  const [recentSync, setRecentSync] = useState<SyncStatus | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        // Fetch pending merges count
        const { count: mergesCount } = await supabase
          .from('ic_pending_merges')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending');

        setPendingMergesCount(mergesCount || 0);

        // Fetch auto-merge rules stats
        const { data: rules } = await supabase
          .from('ic_auto_merge_rules')
          .select('enabled')
          .eq('school_id', schoolId);

        setAutoMergeRulesCount(rules?.length || 0);
        setActiveRulesCount(rules?.filter(r => r.enabled).length || 0);

        // Fetch most recent sync log
        const { data: syncLog } = await supabase
          .from('ic_sync_logs')
          .select('status, completed_at, students_created, students_updated, teachers_created, teachers_updated')
          .eq('school_id', schoolId)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        setRecentSync(syncLog);
      } catch (error) {
        console.error('Error fetching IC metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [schoolId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const getSyncStatusIcon = () => {
    if (!recentSync) return <Clock className="h-4 w-4" />;
    switch (recentSync.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getSyncStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!recentSync) return "secondary";
    switch (recentSync.status) {
      case 'completed':
        return "default";
      case 'failed':
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getTotalRecordsProcessed = () => {
    if (!recentSync) return 0;
    return (
      (recentSync.students_created || 0) +
      (recentSync.students_updated || 0) +
      (recentSync.teachers_created || 0) +
      (recentSync.teachers_updated || 0)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>IC Integration Summary</CardTitle>
        <CardDescription>Key metrics from Infinite Campus sync</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Merges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitMerge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Pending Merges</p>
              <p className="text-xs text-muted-foreground">Records awaiting review</p>
            </div>
          </div>
          <Badge variant={pendingMergesCount > 0 ? "secondary" : "outline"} className="text-lg font-semibold px-3 py-1">
            {pendingMergesCount}
          </Badge>
        </div>

        {/* Auto-Merge Rules */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Auto-Merge Rules</p>
              <p className="text-xs text-muted-foreground">
                {activeRulesCount} active of {autoMergeRulesCount} total
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
            {activeRulesCount}/{autoMergeRulesCount}
          </Badge>
        </div>

        {/* Recent Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <RefreshCw className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Recent Sync</p>
              <p className="text-xs text-muted-foreground">
                {recentSync?.completed_at 
                  ? new Date(recentSync.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })
                  : 'No sync yet'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getSyncStatusVariant()} className="flex items-center gap-1">
              {getSyncStatusIcon()}
              {recentSync?.status || 'N/A'}
            </Badge>
            {recentSync && (
              <span className="text-xs text-muted-foreground">
                {getTotalRecordsProcessed()} records
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
