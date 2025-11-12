import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { AlertTriangle } from "lucide-react";
import { useBulkSessionAssignment } from "@/hooks/useBulkSessionAssignment";

interface BulkSessionAssignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  entityType: "group" | "run";
  sessions: Array<{ id: string; session_name: string; is_active: boolean }>;
  onSuccess?: () => void;
}

export function BulkSessionAssigner({
  open,
  onOpenChange,
  selectedIds,
  entityType,
  sessions,
  onSuccess,
}: BulkSessionAssignerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const { mutate: assignSession, isPending } = useBulkSessionAssignment();

  const entityLabel = entityType === "group" ? "groups" : "runs";
  const tableType = entityType === "group" ? "special_use_groups" : "special_use_runs";

  const handleAssign = () => {
    if (!selectedSessionId || selectedIds.length === 0) return;

    assignSession(
      {
        ids: selectedIds,
        sessionId: selectedSessionId,
        entityType: tableType,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
          setSelectedSessionId("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Academic Session</DialogTitle>
          <DialogDescription>
            Assign an academic session to {selectedIds.length} selected {entityLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              This will update the academic session for all {selectedIds.length} selected {entityLabel}.
              This action cannot be undone.
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-select">Academic Session</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger id="session-select">
                <SelectValue placeholder="Select a session..." />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.session_name}
                    {session.is_active && " (Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedSessionId || isPending}>
            {isPending ? "Assigning..." : `Assign to ${selectedIds.length} ${entityLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
