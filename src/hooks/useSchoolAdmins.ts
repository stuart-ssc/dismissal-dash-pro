import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SchoolAdmin = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export const useSchoolAdmins = () => {
  const { user } = useAuth();
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
        // Get current user's school_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.school_id) {
          setSchoolAdmins([]);
          setHasSchoolAdmin(false);
          setLoading(false);
          return;
        }

        // Get school admin user IDs first
        const { data: adminRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "school_admin");

        if (rolesError) throw rolesError;
        
        const adminUserIds = adminRoles?.map(role => role.user_id) || [];
        
        if (adminUserIds.length === 0) {
          setSchoolAdmins([]);
          setHasSchoolAdmin(false);
          setLoading(false);
          return;
        }

        // Find all school admins for this school
        const { data: admins, error: adminsError } = await supabase
          .from("profiles")
          .select(`
            id,
            first_name,
            last_name,
            email
          `)
          .eq("school_id", profile.school_id)
          .in("id", adminUserIds);

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
  }, [user]);

  return { loading, error, schoolAdmins, hasSchoolAdmin };
};