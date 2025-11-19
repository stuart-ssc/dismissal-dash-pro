import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDistrictAuth } from "./useDistrictAuth";

export interface DistrictUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  school_id: number | null;
  school_name?: string | null;
  role: string;
  last_sign_in_at: string | null;
}

export const useDistrictUsers = (schoolFilter?: number | "all") => {
  const { district } = useDistrictAuth();

  return useQuery({
    queryKey: ["district-users", district?.id, schoolFilter],
    queryFn: async () => {
      if (!district?.id) return [];

      // Get all schools in district
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, school_name")
        .eq("district_id", district.id);

      if (schoolsError) throw schoolsError;

      const schoolIds = schools?.map((s) => s.id) || [];
      if (schoolIds.length === 0) return [];

      // Build query for profiles
      let query = supabase
        .from("profiles")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          school_id
        `
        )
        .in("school_id", schoolIds);

      // Apply school filter if specific school selected
      if (schoolFilter && schoolFilter !== "all") {
        query = query.eq("school_id", schoolFilter);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get roles for each user
      const userIds = profiles.map((p) => p.id);
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Get last sign in from auth metadata
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      
      const authUsers = authData?.users || [];

      // Combine data
      const users: DistrictUser[] = profiles.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        const authUser = authUsers.find((u) => u.id === profile.id);
        const school = schools?.find((s) => s.id === profile.school_id);

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          school_id: profile.school_id,
          school_name: school?.school_name,
          role: userRole?.role || "unknown",
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      });

      return users;
    },
    enabled: !!district?.id,
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const transferUser = useMutation({
    mutationFn: async ({
      userId,
      targetSchoolId,
    }: {
      userId: string;
      targetSchoolId: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("transfer-user-school", {
        body: { userId, targetSchoolId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["district-users"] });
      toast({
        title: "User transferred",
        description: "The user has been transferred successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error transferring user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete user from auth
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["district-users"] });
      toast({
        title: "User archived",
        description: "The user has been archived successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error archiving user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    transferUser,
    archiveUser,
  };
};
