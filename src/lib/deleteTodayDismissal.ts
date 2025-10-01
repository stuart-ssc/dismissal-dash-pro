import { supabase } from "@/integrations/supabase/client";

export async function deleteTodayDismissal() {
  const { data, error } = await supabase.functions.invoke('delete-today-dismissal');

  if (error) {
    console.error('Error deleting today\'s dismissal:', error);
    throw error;
  }

  return data;
}
