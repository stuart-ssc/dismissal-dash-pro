import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Calendar, AlertCircle, School } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WizardState, ICSchoolOption } from '../ICConnectionWizard';

interface StepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  schoolId: number;
  onComplete?: () => void;
}

type LoadingPhase = 'connecting' | 'authenticating' | 'detecting' | 'fetching' | 'complete' | 'error';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  connecting: 'Connecting to Infinite Campus...',
  authenticating: 'Authenticating credentials...',
  detecting: 'Detecting OneRoster version...',
  fetching: 'Fetching schools and preview data...',
  complete: 'Connection successful!',
  error: 'Connection failed',
};

export function ICTestConnectionStep({ state, updateState, nextStep, goToStep, schoolId }: StepProps) {
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('connecting');
  const [isTesting, setIsTesting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<ICSchoolOption | null>(state.selectedICSchool);

  // Always fetch fresh data when entering this step
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setLoadingPhase('connecting');

    try {
      setTimeout(() => setLoadingPhase('authenticating'), 500);
      setTimeout(() => setLoadingPhase('detecting'), 1500);
      setTimeout(() => setLoadingPhase('fetching'), 2500);

      let data: any;
      let error: any;

      if (state.districtAlreadyConnected && state.connectionId) {
        // PATH B: District already connected — use server-side credentials
        console.log('Using stored district credentials via get-ic-district-schools');
        const result = await supabase.functions.invoke('get-ic-district-schools', {
          body: {
            districtConnectionId: state.connectionId,
            schoolId,
          },
        });
        data = result.data;
        error = result.error;
      } else {
        // PATH A: Fresh setup — send real credentials
        console.log('Testing with user-provided credentials');
        const result = await supabase.functions.invoke('test-ic-connection', {
          body: {
            baseUrl: state.credentials.baseUrl,
            clientId: state.credentials.clientId,
            clientSecret: state.credentials.clientSecret,
            tokenUrl: state.credentials.tokenUrl,
            appName: state.credentials.appName,
            schoolId,
          },
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Supabase client error (network, etc.)
        throw error;
      }

      if (data?.valid) {
        setLoadingPhase('complete');
        updateState({
          testResults: {
            valid: true,
            version: data.version,
            schools: data.schools,
            suggestedMatch: data.suggestedMatch,
            preview: data.preview,
          },
        });

        // Auto-select suggested match
        if (data.suggestedMatch && data.suggestedMatch.confidence > 0.5) {
          const matchedSchool = data.schools?.find(
            (s: ICSchoolOption) => s.sourcedId === data.suggestedMatch.sourcedId
          );
          if (matchedSchool) {
            setSelectedSchool(matchedSchool);
            updateState({ selectedICSchool: matchedSchool });
          }
        }

        toast.success('Connection successful!');
      } else {
        // Structured error from our edge function
        setLoadingPhase('error');
        updateState({
          testResults: {
            valid: false,
            error: data?.error || 'Connection test failed',
          },
        });
        toast.error(data?.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      setLoadingPhase('error');
      updateState({
        testResults: {
          valid: false,
          error: error.message || 'Failed to test connection. Please check your network and try again.',
        },
      });
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSchoolSelect = (school: ICSchoolOption) => {
    setSelectedSchool(school);
    updateState({ selectedICSchool: school });
  };

  const handleRefresh = () => {
    setSelectedSchool(null);
    updateState({ testResults: null, selectedICSchool: null });
    testConnection();
  };

  const handleContinue = () => {
    if (!selectedSchool) {
      toast.error('Please select your school from the list');
      return;
    }
    nextStep();
  };

  const getTroubleshootingTips = (error?: string): string[] => {
    if (!error) return [];
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('authentication') || lowerError.includes('unauthorized') || lowerError.includes('oauth')) {
      return [
        'Double-check your Client ID and Client Secret for typos',
        'Verify that the API credentials are active in Infinite Campus',
        'Make sure the App Name is correct and case-sensitive',
        'Confirm the Token URL is correct',
      ];
    }
    if (lowerError.includes('permission')) {
      return [
        'Your account may not have access to this school',
        'Contact your administrator to verify your school assignment',
      ];
    }
    if (lowerError.includes('decrypt')) {
      return [
        'The stored credentials may need to be re-entered',
        'Contact your district administrator to reconfigure the connection',
      ];
    }
    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return [
        'Verify that the Base URL is correct and accessible',
        'Check if your firewall is blocking the connection',
        'Try again in a few minutes',
      ];
    }
    if (lowerError.includes('placeholder') || lowerError.includes('masked')) {
      return [
        'This is a system error — please go back and re-enter your credentials',
        'If the problem persists, clear the wizard and start over',
      ];
    }
    return [
      'Verify all credentials are correct',
      'Make sure the Base URL does NOT include "/campus" — we add that automatically',
      'Ensure your App Name matches the IC API documentation',
      'Contact your IT administrator for assistance',
    ];
  };

  // Loading state
  if (isTesting || (!state.testResults && loadingPhase !== 'error')) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-12">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">
            {state.districtAlreadyConnected ? 'Fetching Schools' : 'Testing Connection'}
          </h3>
          <p className="text-muted-foreground">{PHASE_MESSAGES[loadingPhase]}</p>
        </div>

        <div className="w-full max-w-md space-y-2">
          {(['connecting', 'authenticating', 'detecting', 'fetching'] as LoadingPhase[]).map((phase, index) => (
            <div key={phase} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                loadingPhase === phase 
                  ? 'bg-primary text-primary-foreground'
                  : ['connecting', 'authenticating', 'detecting', 'fetching'].indexOf(loadingPhase) > index
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted'
              }`}>
                {['connecting', 'authenticating', 'detecting', 'fetching'].indexOf(loadingPhase) > index ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : loadingPhase === phase ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span className={`text-sm ${loadingPhase === phase ? 'font-semibold' : ''}`}>
                {PHASE_MESSAGES[phase]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (state.testResults && !state.testResults.valid) {
    const tips = getTroubleshootingTips(state.testResults.error);
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Connection Failed</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't establish a connection to your Infinite Campus instance.
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {state.testResults.error}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Troubleshooting Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => goToStep(2)}>
            Edit Credentials
          </Button>
          <Button onClick={() => { updateState({ testResults: null }); testConnection(); }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Success state with school selection
  if (state.testResults && state.testResults.valid) {
    const { preview, version, schools, suggestedMatch } = state.testResults;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Connection Successful!</h3>
            <p className="text-muted-foreground">
              Now select your school from the list below.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="text-sm">OneRoster {version}</Badge>
          {preview && (
            <Badge variant="outline" className="text-sm">{preview.orgName}</Badge>
          )}
        </div>

        {/* School Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              Select Your School
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestedMatch && (
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  We found a likely match: <strong>{suggestedMatch.name}</strong> 
                  {suggestedMatch.confidence >= 0.8 ? ' (high confidence)' : ' (partial match)'}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {schools && schools.length > 0 ? (
                schools.map((school) => (
                  <button
                    key={school.sourcedId}
                    onClick={() => handleSchoolSelect(school)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedSchool?.sourcedId === school.sourcedId
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : suggestedMatch?.sourcedId === school.sourcedId
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {school.sourcedId}</p>
                      </div>
                      {selectedSchool?.sourcedId === school.sourcedId && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                      {suggestedMatch?.sourcedId === school.sourcedId && selectedSchool?.sourcedId !== school.sourcedId && (
                        <Badge variant="secondary" className="text-xs">Suggested</Badge>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No schools found in the IC system. Please verify your credentials and App Name.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Academic Sessions */}
        {preview && preview.academicSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Academic Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {preview.academicSessions.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="font-medium">{session.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.start).toLocaleDateString()} - {new Date(session.end).toLocaleDateString()}
                      </p>
                    </div>
                    {session.isActive && <Badge variant="default">Active</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => goToStep(2)}>
            {state.districtAlreadyConnected ? 'Back' : 'Edit Credentials'}
          </Button>
          <Button size="lg" onClick={handleContinue} disabled={!selectedSchool}>
            Continue to Sync Configuration
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
