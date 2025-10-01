import { supabase } from "@/integrations/supabase/client";

export async function resetDismissalRun(runId: string) {
  const { data, error } = await supabase.functions.invoke('reset-dismissal-run', {
    body: { runId }
  });

  if (error) {
    console.error('Error resetting dismissal run:', error);
    throw error;
  }

  return data;
}
