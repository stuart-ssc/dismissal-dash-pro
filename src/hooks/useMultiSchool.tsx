import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface School {
  id: number;
  school_name: string;
  is_primary: boolean;
}

interface MultiSchoolContextType {
  schools: School[];
  activeSchoolId: number | null;
  isLoading: boolean;
  switchSchool: (schoolId: number) => Promise<void>;
  refreshSchools: () => Promise<void>;
  isPrimarySchool: (schoolId: number) => boolean;
}

const MultiSchoolContext = createContext<MultiSchoolContextType | undefined>(undefined);

export const MultiSchoolProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchools = async () => {
    if (!user) {
      setSchools([]);
      setActiveSchoolId(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch schools from user_schools
      const { data: userSchools, error } = await supabase
        .from('user_schools')
        .select('school_id, is_primary, schools(school_name)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (userSchools && userSchools.length > 0) {
        const schoolsList: School[] = userSchools.map((us: any) => ({
          id: us.school_id,
          school_name: us.schools?.school_name || `School #${us.school_id}`,
          is_primary: us.is_primary || false,
        }));

        setSchools(schoolsList);

        // Check for saved active school in localStorage
        const savedSchoolId = localStorage.getItem('active_school_id');
        if (savedSchoolId && schoolsList.find(s => s.id === Number(savedSchoolId))) {
          setActiveSchoolId(Number(savedSchoolId));
        } else {
          // Default to primary school or first school
          const primarySchool = schoolsList.find(s => s.is_primary);
          const defaultSchool = primarySchool || schoolsList[0];
          setActiveSchoolId(defaultSchool.id);
          localStorage.setItem('active_school_id', String(defaultSchool.id));
        }
      } else {
        // Fallback: get school from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, schools(school_name)')
          .eq('id', user.id)
          .single();

        if (profile?.school_id) {
          const singleSchool: School = {
            id: profile.school_id,
            school_name: profile.schools?.school_name || `School #${profile.school_id}`,
            is_primary: true,
          };
          setSchools([singleSchool]);
          setActiveSchoolId(singleSchool.id);
          localStorage.setItem('active_school_id', String(singleSchool.id));
        }
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [user]);

  const switchSchool = async (schoolId: number) => {
    setIsLoading(true);
    try {
      setActiveSchoolId(schoolId);
      localStorage.setItem('active_school_id', String(schoolId));
      
      const school = schools.find(s => s.id === schoolId);
      toast.success(`Switched to ${school?.school_name || 'school'}`);
      
      // Reload page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error switching school:', error);
      toast.error('Failed to switch school');
    } finally {
      setIsLoading(false);
    }
  };

  const isPrimarySchool = (schoolId: number): boolean => {
    return schools.find(s => s.id === schoolId)?.is_primary || false;
  };

  return (
    <MultiSchoolContext.Provider
      value={{
        schools,
        activeSchoolId,
        isLoading,
        switchSchool,
        refreshSchools: fetchSchools,
        isPrimarySchool,
      }}
    >
      {children}
    </MultiSchoolContext.Provider>
  );
};

export const useMultiSchool = () => {
  const context = useContext(MultiSchoolContext);
  if (context === undefined) {
    throw new Error('useMultiSchool must be used within a MultiSchoolProvider');
  }
  return context;
};
