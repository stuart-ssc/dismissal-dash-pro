import { Button } from '@/components/ui/button';
import { CheckCircle2, Shield, Zap, RefreshCw } from 'lucide-react';
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

export function ICWelcomeStep({ nextStep }: StepProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">
      <div className="text-center space-y-4 max-w-2xl">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
          <RefreshCw className="h-10 w-10 text-primary-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold">Connect to Infinite Campus</h1>
        
        <p className="text-lg text-muted-foreground">
          Automatically sync your student rosters, teacher schedules, and class enrollments 
          to keep your dismissal system always up-to-date.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 w-full max-w-3xl">
        <div className="space-y-3 p-6 rounded-lg border bg-card">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Automatic Syncing</h3>
          <p className="text-sm text-muted-foreground">
            Schedule syncs to run automatically at your preferred times. No more manual data entry.
          </p>
        </div>

        <div className="space-y-3 p-6 rounded-lg border bg-card">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <h3 className="font-semibold text-lg">Real-time Updates</h3>
          <p className="text-sm text-muted-foreground">
            Student changes, new enrollments, and schedule updates sync seamlessly.
          </p>
        </div>

        <div className="space-y-3 p-6 rounded-lg border bg-card">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Smart Duplicate Handling</h3>
          <p className="text-sm text-muted-foreground">
            Our intelligent merge system detects and helps resolve duplicate records.
          </p>
        </div>

        <div className="space-y-3 p-6 rounded-lg border bg-card">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Secure & Encrypted</h3>
          <p className="text-sm text-muted-foreground">
            Your credentials are encrypted and stored securely. We take data security seriously.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-4 pt-4">
        <Button size="lg" onClick={nextStep} className="px-8">
          Get Started
        </Button>
        <p className="text-sm text-muted-foreground">
          Setup takes about 5 minutes
        </p>
      </div>
    </div>
  );
}
