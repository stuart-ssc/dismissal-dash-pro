import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ICConnectionWizard } from "@/components/ICConnectionWizard";

interface ICSetupDialogProps {
  open: boolean;
  onClose: () => void;
  schoolId: number;
  onComplete: () => void;
}

export function ICSetupDialog({ 
  open, 
  onClose, 
  schoolId, 
  onComplete 
}: ICSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect to Infinite Campus</DialogTitle>
        </DialogHeader>
        <ICConnectionWizard
          schoolId={schoolId}
          onComplete={onComplete}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
