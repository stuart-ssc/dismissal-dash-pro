import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useImpersonation() {
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current impersonation status on mount
  useEffect(() => {
    const fetchImpersonationStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-impersonation-status');

        if (error) {
          console.error('Failed to fetch impersonation status:', error);
          setSchoolId(null);
        } else if (data?.isImpersonating) {
          setSchoolId(data.schoolId);
        } else {
          setSchoolId(null);
        }
      } catch (error) {
        console.error('Error fetching impersonation status:', error);
        setSchoolId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImpersonationStatus();
  }, []);

  const impersonate = async (id: number | null) => {
    setIsLoading(true);

    try {
      if (id === null) {
        // End impersonation
        const { error } = await supabase.functions.invoke('end-impersonation');

        if (error) {
          console.error('Failed to end impersonation:', error);
          toast.error('Failed to stop impersonating school');
          setIsLoading(false);
          return;
        }

        setSchoolId(null);
        toast.success('Stopped impersonating school');
        
        // Refresh the page to clear any cached data
        window.location.reload();
      } else {
        // Start impersonation
        const { data, error } = await supabase.functions.invoke('start-impersonation', {
          body: { schoolId: id }
        });

        if (error) {
          console.error('Failed to start impersonation:', error);
          toast.error('Failed to impersonate school');
          setIsLoading(false);
          return;
        }

        setSchoolId(id);
        toast.success(`Now impersonating: ${data.schoolName}`);
        
        // Refresh the page to load data for the impersonated school
        window.location.reload();
      }
    } catch (error) {
      console.error('Error managing impersonation:', error);
      toast.error('An error occurred while managing school impersonation');
      setIsLoading(false);
    }
  };

  return { 
    impersonatedSchoolId: schoolId, 
    setImpersonatedSchoolId: impersonate,
    isLoadingImpersonation: isLoading 
  };
}
