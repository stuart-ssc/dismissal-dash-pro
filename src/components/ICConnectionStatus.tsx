import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, History, Loader2, Unplug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ICConnectionStatusProps {
  connection: any;
  onDisconnect: () => void;
}

export const ICConnectionStatus = ({ connection, onDisconnect }: ICConnectionStatusProps) => {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectConfirmed, setDisconnectConfirmed] = useState(false);
  const [lastSync, setLastSync] = useState<any>(null);
  const [syncStats, setSyncStats] = useState<any>(null);

  useEffect(() => {
    fetchLastSync();
  }, [connection]);

  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from('ic_sync_logs')
        .select('*')
        .eq('school_id', connection.school_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setLastSync(data);
        setSyncStats({
          studentsSync: data.students_created + data.students_updated,
          teachersSync: data.teachers_created + data.teachers_updated,
          classesSync: data.classes_created + data.classes_updated,
        });
      }
    } catch (error) {
      console.error('Error fetching last sync:', error);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-infinite-campus', {
        body: {
          schoolId: connection.school_id,
          syncType: 'manual',
        },
      });

      if (error) throw error;

      toast.success('Sync started successfully', {
        description: 'The sync is running in the background. You can view progress in Sync History.',
      });
      
      // Poll for completion
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const { data: logs } = await supabase
          .from('ic_sync_logs')
          .select('status')
          .eq('school_id', connection.school_id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (logs && logs.status === 'completed') {
          clearInterval(pollInterval);
          setIsSyncing(false);
          toast.success('Sync completed successfully');
          fetchLastSync();
        } else if (logs && logs.status === 'failed') {
          clearInterval(pollInterval);
          setIsSyncing(false);
          toast.error('Sync failed', { description: 'Check Sync History for details' });
        } else if (attempts > 60) {
          // Stop polling after 5 minutes
          clearInterval(pollInterval);
          setIsSyncing(false);
          toast.info('Sync is still running', { description: 'Check Sync History for updates' });
        }
      }, 5000);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to start sync');
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectConfirmed) {
      toast.error('Please confirm you understand the consequences');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('disconnect-ic', {
        body: { schoolId: connection.school_id },
      });

      if (error) throw error;

      toast.success('Disconnected from Infinite Campus');
      setDisconnectDialogOpen(false);
      onDisconnect();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="font-medium">Connected to Infinite Campus</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">OneRoster Version:</span>
          <Badge>{connection.version}</Badge>
        </div>
        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Last Sync: {formatDistanceToNow(new Date(lastSync.completed_at), { addSuffix: true })}
          </p>
        )}
      </div>

      {syncStats && (
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="text-sm font-medium">Quick Stats</h4>
          <ul className="text-sm space-y-1">
            <li>• {syncStats.studentsSync} students synced</li>
            <li>• {syncStats.teachersSync} teachers synced</li>
            <li>• {syncStats.classesSync} classes synced</li>
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSyncNow} disabled={isSyncing}>
          {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sync Now
        </Button>
        <Button variant="outline" onClick={() => navigate('/dashboard/integrations/ic-sync-history')}>
          <History className="mr-2 h-4 w-4" />
          View History
        </Button>
        <Button variant="destructive" onClick={() => setDisconnectDialogOpen(true)}>
          <Unplug className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </div>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Infinite Campus?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection but keep your existing data. External IDs will be cleared from students, teachers, and classes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 my-4">
            <Checkbox
              id="disconnect-confirm"
              checked={disconnectConfirmed}
              onCheckedChange={(checked) => setDisconnectConfirmed(checked as boolean)}
            />
            <label htmlFor="disconnect-confirm" className="text-sm cursor-pointer">
              I understand that future syncs will not be possible until I reconnect
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisconnectConfirmed(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
