import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpersonationStatus {
  isImpersonating: boolean;
  schoolId: number | null;
  schoolName: string | null;
  adminType: 'system_admin' | 'district_admin' | null;
  isLoading: boolean;
}

export function useImpersonationStatus() {
  const [status, setStatus] = useState<ImpersonationStatus>({
    isImpersonating: false,
    schoolId: null,
    schoolName: null,
    adminType: null,
    isLoading: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        // Check system admin impersonation
        const { data: systemData } = await supabase.functions.invoke('get-impersonation-status');
        
        if (systemData?.isImpersonating) {
          setStatus({
            isImpersonating: true,
            schoolId: systemData.schoolId,
            schoolName: systemData.schoolName,
            adminType: 'system_admin',
            isLoading: false,
          });
          return;
        }

        // Check district admin impersonation
        const { data: districtData } = await supabase.functions.invoke('get-district-impersonation-status');
        
        if (districtData?.isDistrictImpersonating) {
          setStatus({
            isImpersonating: true,
            schoolId: districtData.schoolId,
            schoolName: districtData.schoolName,
            adminType: 'district_admin',
            isLoading: false,
          });
          return;
        }

        // No impersonation active
        setStatus({
          isImpersonating: false,
          schoolId: null,
          schoolName: null,
          adminType: null,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error checking impersonation status:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkImpersonation();
  }, []);

  const endImpersonation = async () => {
    if (!status.adminType) return;

    try {
      const functionName = status.adminType === 'system_admin' 
        ? 'end-impersonation' 
        : 'end-district-impersonation';
      
      const { error } = await supabase.functions.invoke(functionName);
      
      if (!error) {
        toast.success('Ended impersonation');
        const returnPath = status.adminType === 'system_admin' ? '/admin' : '/district-dash';
        navigate(returnPath);
      } else {
        toast.error('Failed to end impersonation');
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
      toast.error('An error occurred while ending impersonation');
    }
  };

  return { ...status, endImpersonation };
}
