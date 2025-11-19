import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDistrictAuth } from "./useDistrictAuth";

export interface DistrictICConnection {
  school_id: number;
  school_name: string;
  is_connected: boolean;
  connection_id?: string;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  configured_by?: string | null;
  configured_by_role?: string | null;
  configured_by_name?: string;
}

export const useDistrictICConnections = () => {
  const { district } = useDistrictAuth();

  return useQuery({
    queryKey: ["district-ic-connections", district?.id],
    queryFn: async () => {
      if (!district?.id) return [];

      // Get all schools in district
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, school_name")
        .eq("district_id", district.id)
        .order("school_name");

      if (schoolsError) throw schoolsError;

      // Get IC connections for all schools
      const schoolIds = schools?.map((s) => s.id) || [];
      const { data: connections, error: connectionsError } = await supabase
        .from("infinite_campus_connections")
        .select("*")
        .in("school_id", schoolIds);

      if (connectionsError) throw connectionsError;

      // Get configured_by user names
      const configuredByIds = connections
        ?.map((c) => c.configured_by)
        .filter(Boolean) || [];
      
      const { data: profiles, error: profilesError } = configuredByIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", configuredByIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      // Combine data
      const icConnections: DistrictICConnection[] = schools?.map((school) => {
        const connection = connections?.find((c) => c.school_id === school.id);
        const configuredByProfile = connection?.configured_by
          ? profiles?.find((p) => p.id === connection.configured_by)
          : null;

        return {
          school_id: school.id,
          school_name: school.school_name || "Unknown",
          is_connected: !!connection,
          connection_id: connection?.id,
          last_sync_at: connection?.last_sync_at,
          last_sync_status: connection?.last_sync_status,
          configured_by: connection?.configured_by,
          configured_by_role: connection?.configured_by_role,
          configured_by_name: configuredByProfile
            ? `${configuredByProfile.first_name || ""} ${configuredByProfile.last_name || ""}`.trim()
            : undefined,
        };
      }) || [];

      return icConnections;
    },
    enabled: !!district?.id,
  });
};
