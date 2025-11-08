import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";

interface CancelRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  runName: string;
  runDate: string;
  onSuccess?: () => void;
}

export function CancelRunDialog({
  open,
  onOpenChange,
  runId,
  runName,
  runDate,
  onSuccess,
}: CancelRunDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleCancel = async () => {
    if (!user) {
      toast.error("You must be logged in to cancel a run");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("special_use_runs")
        .update({
          status: "cancelled",
          cancellation_reason: reason.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        })
        .eq("id", runId);

      if (error) throw error;

      toast.success("Run cancelled successfully");
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error cancelling run:", error);
      toast.error(error.message || "Failed to cancel run");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Special Use Run?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="space-y-2">
              <p>You are about to cancel the following run:</p>
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="font-medium">{runName}</p>
                <p className="text-sm text-muted-foreground">{runDate}</p>
              </div>
              <p className="text-destructive font-medium">
                This will mark the run as cancelled. This action updates the
                record for audit purposes.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Please explain why this run is being cancelled..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                disabled={loading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep Run
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
