import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface District {
  id: string;
  district_name: string;
  timezone: string;
}

interface DistrictAuthContextType {
  district: District | null;
  districtSchools: { id: number; school_name: string }[];
  impersonatedSchoolId: number | null;
  isLoading: boolean;
  switchSchool: (schoolId: number | null) => Promise<void>;
  refreshDistrict: () => Promise<void>;
}

const DistrictAuthContext = createContext<DistrictAuthContextType | undefined>(undefined);

export const DistrictAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, userRole } = useAuth();
  const [district, setDistrict] = useState<District | null>(null);
  const [districtSchools, setDistrictSchools] = useState<{ id: number; school_name: string }[]>([]);
  const [impersonatedSchoolId, setImpersonatedSchoolId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDistrict = async () => {
    if (!user || userRole !== 'district_admin') {
      setDistrict(null);
      setDistrictSchools([]);
      setImpersonatedSchoolId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user's primary district
      const { data: userDistrict, error: userDistrictError } = await supabase
        .from('user_districts')
        .select('district_id, districts(id, district_name, timezone)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (userDistrictError) throw userDistrictError;

      if (userDistrict?.districts) {
        setDistrict(userDistrict.districts as District);

        // Fetch schools in this district
        const { data: schools, error: schoolsError } = await supabase
          .from('schools')
          .select('id, school_name')
          .eq('district_id', userDistrict.district_id)
          .order('school_name');

        if (schoolsError) throw schoolsError;
        setDistrictSchools(schools || []);

        // Check for impersonation session
        const savedSchoolId = localStorage.getItem('district_impersonated_school_id');
        if (savedSchoolId && schools?.find(s => s.id === Number(savedSchoolId))) {
          setImpersonatedSchoolId(Number(savedSchoolId));
        }
      }
    } catch (error) {
      console.error('Error fetching district:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDistrict();
  }, [user, userRole]);

  const switchSchool = async (schoolId: number | null) => {
    setImpersonatedSchoolId(schoolId);
    if (schoolId) {
      localStorage.setItem('district_impersonated_school_id', String(schoolId));
    } else {
      localStorage.removeItem('district_impersonated_school_id');
    }
    // Reload to refresh context
    window.location.reload();
  };

  return (
    <DistrictAuthContext.Provider
      value={{
        district,
        districtSchools,
        impersonatedSchoolId,
        isLoading,
        switchSchool,
        refreshDistrict: fetchDistrict,
      }}
    >
      {children}
    </DistrictAuthContext.Provider>
  );
};

export const useDistrictAuth = () => {
  const context = useContext(DistrictAuthContext);
  if (context === undefined) {
    throw new Error('useDistrictAuth must be used within a DistrictAuthProvider');
  }
  return context;
};
