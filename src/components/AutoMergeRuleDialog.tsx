import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface AutoMergeRule {
  id: string;
  rule_name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  min_confidence_score: number;
  allowed_match_types: string[];
  record_types: string[];
}

interface AutoMergeRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: AutoMergeRule | null;
  schoolId: number;
}

interface FormData {
  rule_name: string;
  description: string;
  priority: number;
  min_confidence_score: number;
  allowed_match_types: string[];
  record_types: string[];
}

const MATCH_TYPES = [
  { value: "exact_ic_id", label: "Exact IC ID Match", description: "Existing record has same IC External ID" },
  { value: "exact_email", label: "Exact Email Match", description: "Email addresses match exactly (teachers only)" },
  { value: "exact_name_grade", label: "Exact Name + Grade", description: "First name, last name, and grade all match" },
  { value: "fuzzy_name", label: "Fuzzy Name Match", description: "Names are similar based on string similarity" },
];

const RECORD_TYPES = [
  { value: "student", label: "Students" },
  { value: "teacher", label: "Teachers" },
];

export function AutoMergeRuleDialog({
  open,
  onOpenChange,
  editingRule,
  schoolId,
}: AutoMergeRuleDialogProps) {
  const queryClient = useQueryClient();
  const [confidenceValue, setConfidenceValue] = useState([90]);
  const [selectedMatchTypes, setSelectedMatchTypes] = useState<string[]>([]);
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>(["student", "teacher"]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      rule_name: "",
      description: "",
      priority: 1,
      min_confidence_score: 0.90,
      allowed_match_types: [],
      record_types: ["student", "teacher"],
    },
  });

  useEffect(() => {
    if (editingRule) {
      reset({
        rule_name: editingRule.rule_name,
        description: editingRule.description || "",
        priority: editingRule.priority,
        min_confidence_score: editingRule.min_confidence_score,
        allowed_match_types: editingRule.allowed_match_types,
        record_types: editingRule.record_types,
      });
      setConfidenceValue([editingRule.min_confidence_score * 100]);
      setSelectedMatchTypes(editingRule.allowed_match_types);
      setSelectedRecordTypes(editingRule.record_types);
    } else {
      reset({
        rule_name: "",
        description: "",
        priority: 1,
        min_confidence_score: 0.90,
        allowed_match_types: [],
        record_types: ["student", "teacher"],
      });
      setConfidenceValue([90]);
      setSelectedMatchTypes([]);
      setSelectedRecordTypes(["student", "teacher"]);
    }
  }, [editingRule, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        school_id: schoolId,
        rule_name: data.rule_name,
        description: data.description || null,
        priority: data.priority,
        min_confidence_score: data.min_confidence_score,
        allowed_match_types: data.allowed_match_types,
        record_types: data.record_types,
        enabled: true,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("ic_auto_merge_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ic_auto_merge_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ic-auto-merge-rules"] });
      toast.success(editingRule ? "Rule updated" : "Rule created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save rule: " + error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    if (selectedMatchTypes.length === 0) {
      toast.error("Please select at least one match type");
      return;
    }
    if (selectedRecordTypes.length === 0) {
      toast.error("Please select at least one record type");
      return;
    }

    mutation.mutate({
      ...data,
      min_confidence_score: confidenceValue[0] / 100,
      allowed_match_types: selectedMatchTypes,
      record_types: selectedRecordTypes,
    });
  };

  const handleMatchTypeToggle = (type: string) => {
    setSelectedMatchTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleRecordTypeToggle = (type: string) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? "Edit Auto-Merge Rule" : "Create Auto-Merge Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure automatic approval criteria for IC pending merges
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rule_name">Rule Name *</Label>
            <Input
              id="rule_name"
              {...register("rule_name", { required: "Rule name is required" })}
              placeholder="e.g., High Confidence IC ID Matches"
            />
            {errors.rule_name && (
              <p className="text-sm text-destructive">{errors.rule_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description of when this rule should apply"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              {...register("priority", { 
                required: "Priority is required",
                min: { value: 1, message: "Priority must be at least 1" }
              })}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers are evaluated first (1 = highest priority)
            </p>
            {errors.priority && (
              <p className="text-sm text-destructive">{errors.priority.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label>Minimum Confidence Score: {confidenceValue[0]}%</Label>
              <Slider
                value={confidenceValue}
                onValueChange={setConfidenceValue}
                min={50}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only approve merges with confidence at or above this threshold
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Allowed Match Types *</Label>
            <p className="text-xs text-muted-foreground">
              Select which matching methods are acceptable for auto-approval
            </p>
            {MATCH_TYPES.map((type) => (
              <div key={type.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={type.value}
                  checked={selectedMatchTypes.includes(type.value)}
                  onCheckedChange={() => handleMatchTypeToggle(type.value)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={type.value}
                    className="font-medium cursor-pointer"
                  >
                    {type.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label>Record Types *</Label>
            <p className="text-xs text-muted-foreground">
              Apply this rule to students, teachers, or both
            </p>
            {RECORD_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`record-${type.value}`}
                  checked={selectedRecordTypes.includes(type.value)}
                  onCheckedChange={() => handleRecordTypeToggle(type.value)}
                />
                <Label
                  htmlFor={`record-${type.value}`}
                  className="font-medium cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
