import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDistrictAuth } from "./useDistrictAuth";

export interface DistrictSchool {
  id: number;
  school_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  phone_number: string | null;
  timezone: string | null;
  verification_status: string | null;
  created_at: string;
  updated_at: string;
  district_id: string | null;
}

export const useDistrictSchools = () => {
  const { district } = useDistrictAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ["district-schools", district?.id],
    queryFn: async () => {
      if (!district?.id) return [];

      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("district_id", district.id)
        .order("school_name");

      if (error) throw error;
      return data as DistrictSchool[];
    },
    enabled: !!district?.id,
  });
};

export const useSchoolMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { district } = useDistrictAuth();

  const createSchool = useMutation({
    mutationFn: async (schoolData: Partial<DistrictSchool>) => {
      const { data, error } = await supabase
        .from("schools")
        .insert({ ...schoolData, district_id: district?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["district-schools"] });
      toast({
        title: "School created",
        description: "The school has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating school",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSchool = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<DistrictSchool>;
    }) => {
      const { data, error } = await supabase
        .from("schools")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["district-schools"] });
      toast({
        title: "School updated",
        description: "The school has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating school",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSchoolStatus = useMutation({
    mutationFn: async ({ id, verification_status }: { id: number; verification_status: string }) => {
      const { data, error } = await supabase
        .from("schools")
        .update({ verification_status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["district-schools"] });
      toast({
        title: `School status updated`,
        description: `The school status has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating school status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createSchool,
    updateSchool,
    updateSchoolStatus,
  };
};
