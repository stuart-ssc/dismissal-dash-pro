import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDistrictAuth } from "./useDistrictAuth";

export interface DistrictICConnection {
  school_id: number;
  school_name: string;
  is_connected: boolean;
  connection_id?: string;
  ic_school_name?: string;
  ic_school_sourced_id?: string;
  mapped_at?: string | null;
  mapped_by?: string | null;
}

export interface DistrictICDistrictConnection {
  id: string;
  district_id: string;
  base_url: string;
  app_name: string;
  token_url: string;
  oneroster_version: string;
  status: string;
  configured_by: string | null;
  configured_by_role: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
}

export const useDistrictICConnections = () => {
  const { district } = useDistrictAuth();

  return useQuery({
    queryKey: ["district-ic-connections", district?.id],
    queryFn: async () => {
      if (!district?.id) return { districtConnection: null, schoolMappings: [] as DistrictICConnection[] };

      // Get district-level IC connection
      const { data: districtConn, error: districtConnError } = await supabase
        .from("ic_district_connections")
        .select("*")
        .eq("district_id", district.id)
        .maybeSingle();

      if (districtConnError) throw districtConnError;

      // Get all schools in district
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, school_name")
        .eq("district_id", district.id)
        .order("school_name");

      if (schoolsError) throw schoolsError;

      // Get school mappings if district connection exists
      let mappings: any[] = [];
      if (districtConn) {
        const { data: mappingsData, error: mappingsError } = await supabase
          .from("ic_school_mappings")
          .select("*")
          .eq("district_connection_id", districtConn.id);

        if (mappingsError) throw mappingsError;
        mappings = mappingsData || [];
      }

      // Combine data
      const schoolMappings: DistrictICConnection[] = schools?.map((school) => {
        const mapping = mappings.find((m) => m.school_id === school.id);

        return {
          school_id: school.id,
          school_name: school.school_name || "Unknown",
          is_connected: !!mapping,
          connection_id: mapping?.id,
          ic_school_name: mapping?.ic_school_name,
          ic_school_sourced_id: mapping?.ic_school_sourced_id,
          mapped_at: mapping?.mapped_at,
          mapped_by: mapping?.mapped_by,
        };
      }) || [];

      return {
        districtConnection: districtConn as DistrictICDistrictConnection | null,
        schoolMappings,
      };
    },
    enabled: !!district?.id,
  });
};
