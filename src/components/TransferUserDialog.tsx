import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDistrictSchools } from "@/hooks/useDistrictSchools";
import { useUserMutations } from "@/hooks/useDistrictUsers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const transferSchema = z.object({
  targetSchoolId: z.number({
    required_error: "Please select a target school",
  }),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentSchoolName: string;
}

export default function TransferUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentSchoolName,
}: TransferUserDialogProps) {
  const { toast } = useToast();
  const { data: schools } = useDistrictSchools();
  const { transferUser } = useUserMutations();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

  const handleSubmit = async (formData: TransferFormData) => {
    try {
      await transferUser.mutateAsync({
        userId,
        targetSchoolId: formData.targetSchoolId,
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer User</DialogTitle>
          <DialogDescription>
            Transfer {userName} to a different school in your district.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Current school: <strong>{currentSchoolName}</strong>
            <br />
            Historical data and audit logs will remain attributed to the original school.
          </AlertDescription>
        </Alert>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="targetSchoolId">New School</Label>
            <Select
              onValueChange={(value) =>
                form.setValue("targetSchoolId", Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target school" />
              </SelectTrigger>
              <SelectContent>
                {schools?.map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.school_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.targetSchoolId && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.targetSchoolId.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={transferUser.isPending}>
              {transferUser.isPending ? "Transferring..." : "Transfer User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
