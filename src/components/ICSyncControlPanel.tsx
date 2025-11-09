import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, Pause, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ICSyncControlPanelProps {
  schoolId: number;
  onSyncTriggered?: () => void;
}

interface SyncConfig {
  enabled: boolean;
  paused: boolean;
  paused_until: string | null;
  pause_reason: string | null;
  next_scheduled_sync_at: string | null;
  last_sync_at: string | null;
  interval_type: string;
  interval_value: number;
}

export function ICSyncControlPanel({ schoolId, onSyncTriggered }: ICSyncControlPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [showPauseDialog, setShowPauseDialog] = useState(false);

  useEffect(() => {
    fetchConfiguration();
    const interval = setInterval(fetchConfiguration, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [schoolId]);

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ic_sync_configuration' as any)
        .select('*')
        .eq('school_id', schoolId)
        .single() as any;

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching sync configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.functions.invoke('trigger-manual-sync', {
        body: { schoolId }
      });

      if (error) throw error;

      toast.success('Sync started successfully');
      fetchConfiguration();
      onSyncTriggered?.();
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      toast.error(error.message || 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      setIsPausing(true);
      const action = config?.paused ? 'resume' : 'pause';
      
      const { error } = await supabase.functions.invoke('pause-resume-sync', {
        body: { 
          schoolId, 
          action,
          pauseReason: action === 'pause' ? 'Manually paused by admin' : undefined
        }
      });

      if (error) throw error;

      toast.success(`Sync ${action === 'pause' ? 'paused' : 'resumed'} successfully`);
      fetchConfiguration();
      setShowPauseDialog(false);
    } catch (error: any) {
      console.error('Error pausing/resuming sync:', error);
      toast.error(error.message || 'Failed to update sync status');
    } finally {
      setIsPausing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Control</CardTitle>
          <CardDescription>
            Sync configuration not found. Please configure sync settings first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (config.paused) {
      return <Badge variant="secondary" className="gap-1"><Pause className="h-3 w-3" /> Paused</Badge>;
    }
    if (!config.enabled) {
      return <Badge variant="outline">Disabled</Badge>;
    }
    return <Badge variant="default" className="gap-1"><Play className="h-3 w-3" /> Active</Badge>;
  };

  const getNextSyncText = () => {
    if (config.paused) {
      if (config.paused_until) {
        return `Paused until ${format(new Date(config.paused_until), 'PPp')}`;
      }
      return config.pause_reason || 'Paused indefinitely';
    }
    if (!config.enabled) {
      return 'Sync disabled';
    }
    if (config.next_scheduled_sync_at) {
      return `Next sync: ${format(new Date(config.next_scheduled_sync_at), 'PPp')}`;
    }
    return 'Next sync time not calculated';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync Control Panel</CardTitle>
              <CardDescription>Manage Infinite Campus sync operations</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Info */}
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">{getNextSyncText()}</p>
              {config.last_sync_at && (
                <p className="text-muted-foreground">
                  Last sync: {format(new Date(config.last_sync_at), 'PPp')}
                </p>
              )}
            </div>
          </div>

          {config.paused && config.pause_reason && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-md">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning" />
              <p className="text-sm text-warning-foreground">{config.pause_reason}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSyncNow}
              disabled={isSyncing || config.paused || !config.enabled}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(true)}
              disabled={isPausing || !config.enabled}
              className="flex-1"
            >
              {config.paused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
          </div>

          {/* Sync Schedule Summary */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Sync Frequency: Every {config.interval_value}{' '}
              {config.interval_type === 'hourly' ? 'hour(s)' : 
               config.interval_type === 'daily' ? 'day(s)' : 
               config.interval_type === 'weekly' ? 'week(s)' : 'custom interval'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pause/Resume Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {config?.paused ? 'Resume' : 'Pause'} Sync?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {config?.paused 
                ? 'Are you sure you want to resume automatic syncs? The next sync will occur according to the configured schedule.'
                : 'Are you sure you want to pause automatic syncs? You can still trigger manual syncs while paused.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseResume} disabled={isPausing}>
              {isPausing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config?.paused ? 'Resume' : 'Pause'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}