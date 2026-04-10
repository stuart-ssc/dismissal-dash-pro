import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Edit, Server, Database, Clock, AlertTriangle, Users, BookOpen, Calendar, School } from 'lucide-react';
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

const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Phoenix': 'Arizona Time (MST)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'America/Anchorage': 'Alaska Time (AKST)',
  'Pacific/Honolulu': 'Hawaii Time (HST)',
};

export function ICReviewStep({ state, updateState, nextStep, goToStep, schoolId }: StepProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const getFrequencyDisplay = () => {
    const { intervalType, syncWindowStart } = state.syncConfig;
    
    switch (intervalType) {
      case 'hourly':
        return 'Every hour';
      case 'daily':
        return `Daily at ${syncWindowStart}`;
      case 'weekly':
        return `Weekly on Sunday at ${syncWindowStart}`;
      case 'custom':
        return 'Custom schedule';
      default:
        return intervalType;
    }
  };

  const getEnabledDataTypes = () => {
    const types: string[] = [];
    if (state.syncConfig.dataTypes.students) types.push('Students');
    if (state.syncConfig.dataTypes.teachers) types.push('Teachers');
    if (state.syncConfig.dataTypes.classes) types.push('Classes');
    if (state.syncConfig.dataTypes.enrollments) types.push('Enrollments');
    return types;
  };

  const maskCredential = (value: string): string => {
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('connect-ic-district', {
        body: {
          baseUrl: state.credentials.baseUrl,
          clientId: state.credentials.clientId,
          clientSecret: state.credentials.clientSecret,
          tokenUrl: state.credentials.tokenUrl,
          appName: state.credentials.appName,
          version: state.testResults?.version || '1.2',
          districtId: state.districtId,
          schoolId,
          icSchoolSourcedId: state.selectedICSchool?.sourcedId || '',
          icSchoolName: state.selectedICSchool?.name || '',
          syncConfig: {
            enabled: true,
            interval_type: state.syncConfig.intervalType,
            interval_value: state.syncConfig.intervalValue,
            sync_window_start: state.syncConfig.syncWindowStart,
            sync_window_end: state.syncConfig.syncWindowEnd,
            timezone: state.syncConfig.timezone,
            sync_students: state.syncConfig.dataTypes.students,
            sync_teachers: state.syncConfig.dataTypes.teachers,
            sync_classes: state.syncConfig.dataTypes.classes,
            sync_enrollments: state.syncConfig.dataTypes.enrollments,
            skip_weekends: state.syncConfig.skipWeekends,
          },
        },
      });

      if (error) throw error;

      if (data?.connectionId) {
        updateState({
          connectionId: data.connectionId,
        });
        toast.success('Connection created successfully!');
        nextStep();
      } else {
        throw new Error('No connection ID returned');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to create connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const preview = state.testResults?.preview;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Review & Confirm</h2>
        <p className="text-muted-foreground">
          Review your configuration before connecting to Infinite Campus.
        </p>
      </div>

      {/* Connection Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Connection Details
            </CardTitle>
            <CardDescription className="mt-2">
              Your Infinite Campus connection information
            </CardDescription>
          </div>
          {!state.districtAlreadyConnected && (
            <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Base URL</span>
            <span className="text-sm font-medium">{state.credentials.baseUrl}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">App Name</span>
            <span className="text-sm font-medium">{state.credentials.appName}</span>
          </div>
          {!state.districtAlreadyConnected && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Client ID</span>
                <span className="text-sm font-mono">{maskCredential(state.credentials.clientId)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Client Secret</span>
                <span className="text-sm font-mono">••••••••</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">OneRoster Version</span>
            <Badge variant="outline">{state.testResults?.version || 'Unknown'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Selected School */}
      {state.selectedICSchool && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                Selected School
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
              <Edit className="h-4 w-4 mr-2" />
              Change
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">IC School Name</span>
              <span className="text-sm font-medium">{state.selectedICSchool.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">IC School ID</span>
              <span className="text-sm font-mono text-muted-foreground">{state.selectedICSchool.sourcedId}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Organization</span>
              <span className="text-sm font-medium">{preview.orgName}</span>
            </div>

            {preview.academicSessions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Active Academic Session
                </p>
                {preview.academicSessions.filter(s => s.isActive).map((session, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-muted">
                    <span className="text-sm font-medium">{session.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.start).toLocaleDateString()} - {new Date(session.end).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Sync Configuration
            </CardTitle>
            <CardDescription className="mt-2">
              How and what data will be synced
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goToStep(4)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Frequency</span>
            <span className="text-sm font-medium">{getFrequencyDisplay()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Timezone</span>
            <span className="text-sm font-medium">
              {TIMEZONE_LABELS[state.syncConfig.timezone] || state.syncConfig.timezone}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Data Types</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {getEnabledDataTypes().map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Skip Weekends</span>
            <Badge variant={state.syncConfig.skipWeekends ? 'default' : 'outline'}>
              {state.syncConfig.skipWeekends ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ready Card */}
      <Card className="bg-success/5 border-success/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold mb-1">Ready to Connect</p>
              <p className="text-sm text-muted-foreground">
                Once you click "Connect & Start Syncing", we'll establish the connection and begin your first sync.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end pt-4">
        <Button
          size="lg"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Connection...
            </>
          ) : (
            'Connect & Start Syncing'
          )}
        </Button>
      </div>
    </div>
  );
}
