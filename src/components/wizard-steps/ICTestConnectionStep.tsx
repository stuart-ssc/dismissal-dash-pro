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

export function ICTestConnectionStep({ state }: StepProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Test Connection Step</h2>
        <p className="text-muted-foreground">
          This step will be implemented in Phase 2
        </p>
        <p className="text-sm text-muted-foreground">
          Test results: {state.testResults ? 'Available' : 'Not tested yet'}
        </p>
      </div>
    </div>
  );
}
