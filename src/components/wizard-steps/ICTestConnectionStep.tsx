import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Building2, Users, BookOpen, Calendar, AlertCircle } from 'lucide-react';
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

type LoadingPhase = 'connecting' | 'authenticating' | 'detecting' | 'fetching' | 'complete' | 'error';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  connecting: 'Connecting to Infinite Campus...',
  authenticating: 'Authenticating credentials...',
  detecting: 'Detecting OneRoster version...',
  fetching: 'Fetching preview data...',
  complete: 'Connection successful!',
  error: 'Connection failed',
};

export function ICTestConnectionStep({ state, updateState, nextStep, goToStep, schoolId }: StepProps) {
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('connecting');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Auto-test when entering this step if credentials are provided
    if (state.credentials.hostUrl && state.credentials.clientKey && !state.testResults) {
      testConnection();
    }
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setLoadingPhase('connecting');

    try {
      // Simulate phases for better UX
      setTimeout(() => setLoadingPhase('authenticating'), 500);
      setTimeout(() => setLoadingPhase('detecting'), 1500);
      setTimeout(() => setLoadingPhase('fetching'), 2500);

      const { data, error } = await supabase.functions.invoke('test-ic-connection', {
        body: {
          hostUrl: state.credentials.hostUrl,
          clientKey: state.credentials.clientKey,
          clientSecret: state.credentials.clientSecret,
          tokenUrl: state.credentials.tokenUrl,
          schoolId,
        },
      });

      if (error) throw error;

      if (data.valid) {
        setLoadingPhase('complete');
        updateState({
          testResults: {
            valid: true,
            version: data.version,
            preview: data.preview,
          },
        });
        toast.success('Connection successful!');
      } else {
        setLoadingPhase('error');
        updateState({
          testResults: {
            valid: false,
            error: data.error || 'Connection test failed',
          },
        });
        toast.error('Connection failed');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      setLoadingPhase('error');
      updateState({
        testResults: {
          valid: false,
          error: error.message || 'Failed to test connection',
        },
      });
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const getTroubleshootingTips = (error?: string): string[] => {
    if (!error) return [];

    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('authentication') || lowerError.includes('unauthorized') || lowerError.includes('credentials')) {
      return [
        'Double-check your Client Key and Client Secret for typos',
        'Verify that the API credentials are active in Infinite Campus',
        'Ensure the API has not expired or been revoked',
        'Contact your IT administrator to verify the credentials',
      ];
    }
    
    if (lowerError.includes('network') || lowerError.includes('timeout') || lowerError.includes('connection')) {
      return [
        'Verify that the Host URL is correct and accessible',
        'Check if your firewall is blocking the connection',
        'Ensure Infinite Campus is not experiencing downtime',
        'Try again in a few minutes',
      ];
    }
    
    if (lowerError.includes('token') || lowerError.includes('oauth')) {
      return [
        'Verify the Token URL is correct (usually Host URL + /oauth/token)',
        'Check that OAuth is enabled for your API in Infinite Campus',
        'Ensure the API has proper permissions',
      ];
    }
    
    if (lowerError.includes('permission') || lowerError.includes('access')) {
      return [
        'Verify the API has OneRoster data access permissions',
        'Check that the API is enabled for your school/district',
        'Contact your IT administrator to grant necessary permissions',
      ];
    }

    return [
      'Verify all credentials are correct',
      'Check that the Host URL uses HTTPS',
      'Ensure your Infinite Campus instance is accessible',
      'Contact your IT administrator for assistance',
    ];
  };

  // Loading state
  if (isTesting || loadingPhase === 'connecting' || loadingPhase === 'authenticating' || loadingPhase === 'detecting' || loadingPhase === 'fetching') {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-12">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Testing Connection</h3>
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
              <span className={`text-sm ${
                loadingPhase === phase ? 'font-semibold' : ''
              }`}>
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
          <Button onClick={testConnection}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Success state with preview
  if (state.testResults && state.testResults.valid && state.testResults.preview) {
    const { preview, version } = state.testResults;
    const hasDuplicates = preview.potentialDuplicates.students > 0 || preview.potentialDuplicates.teachers > 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Connection Successful!</h3>
            <p className="text-muted-foreground">
              We've successfully connected to your Infinite Campus instance.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="text-sm">
            OneRoster {version}
          </Badge>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization:</span>
              <span className="font-medium">{preview.orgName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">School:</span>
              <span className="font-medium">{preview.schoolName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Data Counts */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{preview.studentCount}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{preview.teacherCount}</p>
                  <p className="text-sm text-muted-foreground">Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{preview.classCount}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Sessions */}
        {preview.academicSessions.length > 0 && (
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
                    {session.isActive && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Data */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sample Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {preview.sampleStudents.slice(0, 3).map((student, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{student.firstName} {student.lastName}</span>
                    <span className="text-muted-foreground">{student.grade}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sample Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {preview.sampleTeachers.slice(0, 3).map((teacher, index) => (
                  <div key={index} className="text-sm">
                    <p>{teacher.firstName} {teacher.lastName}</p>
                    <p className="text-xs text-muted-foreground">{teacher.email}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Duplicate Warning */}
        {hasDuplicates && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Potential Duplicates Detected:</strong> We found {preview.potentialDuplicates.students} potential duplicate students 
              and {preview.potentialDuplicates.teachers} potential duplicate teachers in your existing data. 
              Our smart merge system will help you review and resolve these after the initial sync.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end pt-4">
          <Button size="lg" onClick={nextStep}>
            Continue to Sync Configuration
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
