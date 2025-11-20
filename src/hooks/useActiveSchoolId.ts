import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useMultiSchool } from '@/hooks/useMultiSchool';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized hook to get the active school ID for the current user context.
 * 
 * Priority order:
 * 1. Impersonation (system admin or district admin impersonating a school)
 * 2. Multi-school selection (user with multiple schools)
 * 3. Profile school_id (single-school user or fallback)
 * 
 * This ensures impersonation works correctly across the entire application.
 */
export function useActiveSchoolId() {
  const { user } = useAuth();
  const { impersonatedSchoolId, isLoadingImpersonation } = useImpersonation();
  const { activeSchoolId: multiSchoolId, isLoading: isLoadingMultiSchool } = useMultiSchool();
  const [profileSchoolId, setProfileSchoolId] = useState<number | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch profile school_id as fallback
  useEffect(() => {
    const fetchProfileSchoolId = async () => {
      if (!user) {
        setProfileSchoolId(null);
        setIsLoadingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        setProfileSchoolId(profile?.school_id ?? null);
      } catch (error) {
        console.error('Error fetching profile school_id:', error);
        setProfileSchoolId(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileSchoolId();
  }, [user]);

  // Priority order: impersonation > multi-school > profile
  const schoolId = impersonatedSchoolId ?? multiSchoolId ?? profileSchoolId;
  const isLoading = isLoadingImpersonation || isLoadingMultiSchool || isLoadingProfile;

  return { schoolId, isLoading };
}
