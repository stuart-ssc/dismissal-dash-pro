import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SchoolSetupStatuses = {
  transportationReady: boolean;
  hasTeacher: boolean;
  hasStudent: boolean;
  hasClass: boolean;
  schoolUpdated: boolean;
};

export const useSchoolSetupStatus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<SchoolSetupStatuses>({
    transportationReady: false,
    hasTeacher: false,
    hasStudent: false,
    hasClass: false,
    schoolUpdated: false,
  });

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Check for impersonation first (system or district admin)
        let schoolId: number | null = null;
        
        // Check system admin impersonation
        const { data: systemImpersonation } = await supabase.functions.invoke('get-impersonation-status');
        if (systemImpersonation?.isImpersonating && systemImpersonation?.schoolId) {
          schoolId = systemImpersonation.schoolId;
        } else {
          // Check district admin impersonation
          const { data: districtImpersonation } = await supabase.functions.invoke('get-district-impersonation-status');
          if (districtImpersonation?.isDistrictImpersonating && districtImpersonation?.schoolId) {
            schoolId = districtImpersonation.schoolId;
          } else {
            // Fall back to user's profile school_id
            const { data: profile, error: profileErr } = await supabase
              .from("profiles")
              .select("school_id")
              .eq("id", user.id)
              .maybeSingle();
            if (profileErr) throw profileErr;
            schoolId = profile?.school_id ?? null;
          }
        }
        
        if (!schoolId) {
          setStatuses({
            transportationReady: false,
            hasTeacher: false,
            hasStudent: false,
            hasClass: false,
            schoolUpdated: false,
          });
          setLoading(false);
          return;
        }

        // Use RPC function to get setup status without RLS restrictions
        const { data, error: rpcError } = await supabase.rpc('get_school_setup_status', { 
          target_school_id: schoolId 
        });
        
        if (rpcError) throw rpcError;
        
        if (!data || data.length === 0) {
          setStatuses({
            transportationReady: false,
            hasTeacher: false,
            hasStudent: false,
            hasClass: false,
            schoolUpdated: false,
          });
          setLoading(false);
          return;
        }

        const status = data[0];
        setStatuses({
          transportationReady: status.transportation_ready,
          hasTeacher: status.has_teacher,
          hasStudent: status.has_student,
          hasClass: status.has_class,
          schoolUpdated: status.school_updated,
        });
      } catch (e: any) {
        console.error("Error computing setup status", e);
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

  const isReady =
    statuses.transportationReady &&
    statuses.hasTeacher &&
    statuses.hasStudent &&
    statuses.hasClass &&
    statuses.schoolUpdated;

  return { loading, error, statuses, isReady } as const;
};
