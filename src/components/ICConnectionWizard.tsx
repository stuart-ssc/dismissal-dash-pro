import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ICWelcomeStep } from './wizard-steps/ICWelcomeStep';
import { ICCredentialsStep } from './wizard-steps/ICCredentialsStep';
import { ICTestConnectionStep } from './wizard-steps/ICTestConnectionStep';
import { ICSyncConfigStep } from './wizard-steps/ICSyncConfigStep';
import { ICReviewStep } from './wizard-steps/ICReviewStep';
import { ICSuccessStep } from './wizard-steps/ICSuccessStep';

export interface ICSchoolOption {
  sourcedId: string;
  name: string;
  type: string;
}

export interface WizardState {
  currentStep: number;
  credentials: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    appName: string;
  };
  testResults: {
    valid: boolean;
    version?: '1.1' | '1.2';
    schools?: ICSchoolOption[];
    suggestedMatch?: {
      sourcedId: string;
      name: string;
      confidence: number;
    };
    preview?: {
      orgName: string;
      studentCount: number;
      teacherCount: number;
      classCount: number;
      academicSessions: Array<{ name: string; start: string; end: string; isActive: boolean }>;
    };
    error?: string;
  } | null;
  selectedICSchool: ICSchoolOption | null;
  syncConfig: {
    intervalType: 'hourly' | 'daily' | 'weekly' | 'custom';
    intervalValue: number;
    syncWindowStart: string;
    syncWindowEnd: string;
    timezone: string;
    dataTypes: {
      students: boolean;
      teachers: boolean;
      classes: boolean;
      enrollments: boolean;
    };
    blackoutDates: string[];
    skipWeekends: boolean;
  };
  connectionId: string | null;
  districtId: string | null;
  districtAlreadyConnected: boolean;
}

const STORAGE_KEY = 'ic-wizard-state';

const STEPS = [
  { id: 1, name: 'Welcome', component: ICWelcomeStep },
  { id: 2, name: 'Credentials', component: ICCredentialsStep },
  { id: 3, name: 'Test & Select', component: ICTestConnectionStep },
  { id: 4, name: 'Sync Config', component: ICSyncConfigStep },
  { id: 5, name: 'Review', component: ICReviewStep },
  { id: 6, name: 'Success', component: ICSuccessStep },
];

interface ICConnectionWizardProps {
  schoolId: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function ICConnectionWizard({ schoolId, onComplete, onCancel }: ICConnectionWizardProps) {
  
  const getInitialState = (): WizardState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.schoolId === schoolId) {
          return parsed.state;
        }
      } catch (e) {
        console.error('Failed to parse saved wizard state:', e);
      }
    }
    
    return {
      currentStep: 1,
      credentials: {
        baseUrl: '',
        clientId: '',
        clientSecret: '',
        tokenUrl: '',
        appName: '',
      },
      testResults: null,
      selectedICSchool: null,
      syncConfig: {
        intervalType: 'daily',
        intervalValue: 1,
        syncWindowStart: '02:00',
        syncWindowEnd: '06:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dataTypes: {
          students: true,
          teachers: true,
          classes: true,
          enrollments: true,
        },
        blackoutDates: [],
        skipWeekends: true,
      },
      connectionId: null,
      districtId: null,
      districtAlreadyConnected: false,
    };
  };

  const [state, setState] = useState<WizardState>(getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schoolId, state }));
  }, [state, schoolId]);

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      updateState({ currentStep: step });
    }
  };

  const nextStep = () => {
    if (state.currentStep < STEPS.length) {
      updateState({ currentStep: state.currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  };

  const handleComplete = () => {
    localStorage.removeItem(STORAGE_KEY);
    onComplete?.();
  };

  const CurrentStepComponent = STEPS[state.currentStep - 1].component;
  const progress = (state.currentStep / STEPS.length) * 100;

  const canGoBack = state.currentStep > 1 && state.currentStep < STEPS.length;
  const isLastStep = state.currentStep === STEPS.length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Infinite Campus Setup</h2>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index + 1 === state.currentStep
                    ? 'text-primary font-semibold'
                    : index + 1 < state.currentStep
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    index + 1 === state.currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index + 1 < state.currentStep
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="hidden sm:block text-xs">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 min-h-[500px]">
          <CurrentStepComponent
            state={state}
            updateState={updateState}
            nextStep={nextStep}
            prevStep={prevStep}
            goToStep={goToStep}
            schoolId={schoolId}
            onComplete={handleComplete}
          />
        </CardContent>
      </Card>

      {!isLastStep && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={!canGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {state.currentStep} of {STEPS.length}
          </div>

          <Button
            onClick={nextStep}
            disabled={state.currentStep >= STEPS.length}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
