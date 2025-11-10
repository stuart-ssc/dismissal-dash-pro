import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { supabase } from "@/integrations/supabase/client";
import { Settings, Globe, Key, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ICSettingsTabProps {
  connection: any;
  schoolId: number | null;
}

export function ICSettingsTab({ connection, schoolId }: ICSettingsTabProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!connection || !schoolId) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-ic-connection', {
        body: {
          schoolId,
          hostUrl: connection.host_url,
          clientKey: connection.client_key,
          clientSecret: connection.client_secret,
          tokenUrl: connection.token_url,
        }
      });

      if (error) throw error;

      if (data.isValid) {
        setTestResult({ success: true, message: 'Connection successful!' });
        toast.success('Connection test passed');
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
        toast.error('Connection test failed');
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, message: error.message || 'Failed to test connection' });
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!schoolId) return;

    setIsDisconnecting(true);

    try {
      const { error } = await supabase.functions.invoke('disconnect-ic', {
        body: { schoolId }
      });

      if (error) throw error;

      toast.success('Infinite Campus disconnected successfully');
      window.location.reload(); // Refresh to show no connection state
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  if (!connection) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Connection</AlertTitle>
        <AlertDescription>
          Infinite Campus is not connected. Go to the Overview tab to set up a connection.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Connection Settings
        </h2>
        <p className="text-muted-foreground">Manage your Infinite Campus integration</p>
      </div>

      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>Your Infinite Campus OneRoster API configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {connection.status === 'active' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Badge variant="default">Active</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive">Inactive</Badge>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">API Version</p>
              <p className="mt-1 font-medium">{connection.version}</p>
            </div>

            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Host URL</p>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="font-mono text-sm">{connection.host_url}</p>
              </div>
            </div>

            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Token URL</p>
              <div className="flex items-center gap-2 mt-1">
                <Key className="h-4 w-4 text-muted-foreground" />
                <p className="font-mono text-sm">{connection.token_url}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Client Key</p>
              <p className="mt-1 font-mono text-sm">•••••••••••••••••</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Client Secret</p>
              <p className="mt-1 font-mono text-sm">•••••••••••••••••</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Result */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage your connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => setShowDisconnectDialog(true)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Disconnect Infinite Campus
          </Button>
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Disconnecting Infinite Campus will stop all automatic syncs. Existing data will remain in DismissalPro,
          but no new updates will be received from Infinite Campus.
        </AlertDescription>
      </Alert>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Infinite Campus?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all automatic syncs. Your existing data will remain in DismissalPro, but no new
              updates will be received from Infinite Campus. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
