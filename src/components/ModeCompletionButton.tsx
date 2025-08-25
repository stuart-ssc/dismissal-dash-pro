import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ModeCompletionButtonProps {
  runId: string;
  mode: 'bus' | 'car_line' | 'walker';
  isCompleted: boolean;
  onCompleted: () => void;
  disabled?: boolean;
}

export function ModeCompletionButton({ 
  runId, 
  mode, 
  isCompleted, 
  onCompleted, 
  disabled = false 
}: ModeCompletionButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const modeLabels = {
    bus: 'Bus',
    car_line: 'Car Line',
    walker: 'Walker'
  };

  const handleComplete = async () => {
    if (!user?.id || isCompleted || disabled) return;

    console.log(`Attempting to complete ${mode} mode for run ${runId} by user ${user.id}`);
    setIsLoading(true);
    try {
      const updateData = {
        [`${mode}_completed`]: true,
        [`${mode}_completed_at`]: new Date().toISOString(),
        [`${mode}_completed_by`]: user.id,
        updated_at: new Date().toISOString()
      };

      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('dismissal_runs')
        .update(updateData)
        .eq('id', runId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      toast({
        title: "Mode Completed",
        description: `${modeLabels[mode]} dismissal has been marked as complete.`,
      });

      onCompleted();
    } catch (error) {
      console.error(`Error completing ${mode} mode:`, error);
      toast({
        title: "Error",
        description: `Failed to mark ${modeLabels[mode]} as complete. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="h-4 w-4 text-green-600" />
        {modeLabels[mode]} Complete
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleComplete}
      disabled={disabled || isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      Complete {modeLabels[mode]}
    </Button>
  );
}