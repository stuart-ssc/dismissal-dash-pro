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

export function ICCredentialsStep({ state }: StepProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Credentials Step</h2>
        <p className="text-muted-foreground">
          This step will be implemented in Phase 2
        </p>
        <p className="text-sm text-muted-foreground">
          Current state: {JSON.stringify(state.credentials, null, 2)}
        </p>
      </div>
    </div>
  );
}
