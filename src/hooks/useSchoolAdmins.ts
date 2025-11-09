import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMultiSchool } from "@/hooks/useMultiSchool";

export type SchoolAdmin = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export const useSchoolAdmins = () => {
  const { user } = useAuth();
  const { activeSchoolId } = useMultiSchool();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdmin[]>([]);
  const [hasSchoolAdmin, setHasSchoolAdmin] = useState(false);

  useEffect(() => {
    const fetchSchoolAdmins = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use secure RPC to get school admins for current user
        const { data: admins, error: adminsError } = await supabase
          .rpc('get_school_admins_for_current_user');

        if (adminsError) throw adminsError;

        setSchoolAdmins(admins || []);
        setHasSchoolAdmin((admins || []).length > 0);
      } catch (e: any) {
        console.error("Error fetching school admins:", e);
        setError(e?.message ?? "Failed to fetch school admins");
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolAdmins();
  }, [user, activeSchoolId]);

  return { loading, error, schoolAdmins, hasSchoolAdmin };
};