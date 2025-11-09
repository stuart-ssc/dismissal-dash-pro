import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Settings, Trash2, Edit, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AutoMergeRuleDialog } from "@/components/AutoMergeRuleDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AutoMergeRule {
  id: string;
  rule_name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  min_confidence_score: number;
  allowed_match_types: string[];
  record_types: string[];
  created_at: string;
}

export default function ICAutoMergeRules() {
  const navigate = useNavigate();
  const { activeSchoolId } = useMultiSchool();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoMergeRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["ic-auto-merge-rules", activeSchoolId],
    queryFn: async () => {
      if (!activeSchoolId) return [];
      const { data, error } = await supabase
        .from("ic_auto_merge_rules")
        .select("*")
        .eq("school_id", activeSchoolId)
        .order("priority", { ascending: true });
      
      if (error) throw error;
      return data as AutoMergeRule[];
    },
    enabled: !!activeSchoolId,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("ic_auto_merge_rules")
        .update({ enabled })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ic-auto-merge-rules"] });
      toast.success("Rule updated");
    },
    onError: (error) => {
      toast.error("Failed to update rule: " + error.message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ic_auto_merge_rules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ic-auto-merge-rules"] });
      toast.success("Rule deleted");
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete rule: " + error.message);
    },
  });

  const handleEdit = (rule: AutoMergeRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setRuleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const getMatchTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      exact_ic_id: { label: "IC ID Match", variant: "default" },
      exact_email: { label: "Email Match", variant: "secondary" },
      exact_name_grade: { label: "Name+Grade", variant: "secondary" },
      fuzzy_name: { label: "Fuzzy Match", variant: "outline" },
    };
    const config = badges[type] || { label: type, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/settings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Auto-Merge Rules</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/settings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Auto-Merge Rules</h1>
            <p className="text-muted-foreground mt-1">
              Configure automatic approval for IC pending merges
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Auto-merge rules automatically approve IC pending merges that meet your criteria.
          Rules are evaluated in priority order (lower numbers first). The first matching rule will be applied.
        </AlertDescription>
      </Alert>

      {!rules || rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Auto-Merge Rules</h3>
            <p className="text-muted-foreground mb-4">
              Create rules to automatically approve high-confidence IC merges
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{rule.rule_name}</CardTitle>
                      <Badge variant="outline">Priority {rule.priority}</Badge>
                      {rule.enabled ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) =>
                        toggleRuleMutation.mutate({ id: rule.id, enabled })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Min Confidence: {(rule.min_confidence_score * 100).toFixed(0)}%
                      </Badge>
                      {rule.record_types.map((type) => (
                        <Badge key={type} variant="secondary">
                          {type === "student" ? "Students" : "Teachers"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Allowed Match Types</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.allowed_match_types.map((type) => (
                        <span key={type}>{getMatchTypeBadge(type)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutoMergeRuleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingRule={editingRule}
        schoolId={activeSchoolId!}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auto-Merge Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
              Merges already approved by this rule will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ruleToDelete && deleteRuleMutation.mutate(ruleToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
