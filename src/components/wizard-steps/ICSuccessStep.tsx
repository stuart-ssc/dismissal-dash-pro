import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Play, Activity, Settings, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WizardState } from '../ICConnectionWizard';

interface StepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  schoolId: number;
  onComplete?: () => void;
}

export function ICSuccessStep({ schoolId, onComplete }: StepProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('trigger-manual-sync', {
        body: { schoolId },
      });

      if (error) throw error;

      toast.success('Manual sync started! This may take a few minutes.');
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast.error(error.message || 'Failed to start manual sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  return (
    <div className="space-y-8">
      {/* Success Animation */}
      <div className="flex flex-col items-center space-y-6 py-8 animate-scale-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <div className="absolute -top-2 -right-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Sparkles className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-3xl font-bold">You're All Set!</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Your Infinite Campus integration is active and ready to sync data automatically.
          </p>
        </div>

        <Badge variant="outline" className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connection Active
        </Badge>
      </div>

      {/* Next Steps */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-xl font-semibold">What's Next?</h3>
        
        {/* First Sync */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  Start Your First Sync
                </CardTitle>
                <CardDescription>
                  Import your students, teachers, and classes from Infinite Campus
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your first automatic sync is scheduled. You can also trigger a manual sync now to 
              start importing data immediately.
            </p>
            <Button 
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Monitor Sync Status */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                Monitor Sync Status
              </CardTitle>
              <CardDescription>
                Track sync progress and view detailed sync history
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              View real-time sync status, check for errors, and see what data has been imported 
              in the Sync Dashboard.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a href="/admin/ic-sync-dashboard">
                  <Activity className="h-4 w-4 mr-2" />
                  View Sync Dashboard
                </a>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href="/admin/ic-sync-history">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Sync History
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configure Advanced Settings */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-purple-500" />
                </div>
                Configure Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune your sync configuration and handle duplicates
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>Set up blackout dates for holidays and school breaks</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>Configure auto-merge rules for duplicate handling</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>Set up data quality alerts and notifications</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>Review pending merge requests</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/ic-auto-merge-rules">
                  Auto-Merge Rules
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/ic-pending-merges">
                  Pending Merges
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/ic-data-quality">
                  Data Quality
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">
                  Sync Settings
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Resources */}
      <Card className="bg-muted/50 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-semibold">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              Check out our documentation for tips on managing your Infinite Campus integration, 
              handling duplicates, and troubleshooting common issues.
            </p>
            <Button variant="link" className="px-0" asChild>
              <a href="/help" target="_blank">
                View Documentation
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t animate-fade-in" style={{ animationDelay: '0.7s' }}>
        <Button variant="outline" onClick={handleComplete}>
          Close Wizard
        </Button>
        <Button onClick={handleComplete}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
