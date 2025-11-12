import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EntityType = "special_use_groups" | "special_use_runs";

interface BulkSessionAssignmentParams {
  ids: string[];
  sessionId: string;
  entityType: EntityType;
}

export function useBulkSessionAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, sessionId, entityType }: BulkSessionAssignmentParams) => {
      const { error } = await supabase
        .from(entityType)
        .update({ academic_session_id: sessionId })
        .in('id', ids);

      if (error) throw error;

      return { count: ids.length };
    },
    onSuccess: (data, variables) => {
      const entityLabel = variables.entityType === "special_use_groups" ? "groups" : "runs";
      toast.success(`Successfully assigned ${data.count} ${entityLabel} to the session`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [variables.entityType] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign sessions");
    },
  });
}
