import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Mail, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentEmail: string;
  userName: string;
  userType: 'completed_account' | 'pending_teacher';
}

export const EmailChangeDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  currentEmail, 
  userName,
  userType 
}: EmailChangeDialogProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  // Check for existing pending requests
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!open || !userId) return;
      
      const { data, error } = await supabase
        .from('email_change_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (!error && data) {
        setExistingRequest(data);
      } else {
        setExistingRequest(null);
      }
    };

    checkExistingRequest();
  }, [open, userId]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('secure-email-change/request', {
        body: {
          userId,
          newEmail,
          reason: reason || null,
          requestType: userType
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Email Change Requested",
        description: data.message || "Email change request has been submitted successfully."
      });

      onOpenChange(false);
      setNewEmail('');
      setReason('');
    } catch (error: any) {
      console.error('Error requesting email change:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit email change request.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSecurityWarning = () => {
    if (userType === 'completed_account') {
      return {
        icon: <Shield className="h-4 w-4" />,
        title: "Security Verification Required",
        description: "The user will receive a verification email at the new address. They must verify before the change takes effect."
      };
    } else {
      return {
        icon: <Mail className="h-4 w-4" />,
        title: "Invitation Will Be Resent",
        description: "A new invitation email will be sent to the new address. The old invitation will be invalidated."
      };
    }
  };

  const securityInfo = getSecurityWarning();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Change Email Address
          </DialogTitle>
          <DialogDescription>
            Request to change email address for {userName}
          </DialogDescription>
        </DialogHeader>

        {existingRequest ? (
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                There is already a pending email change request for this user.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Email:</span>
                <span className="text-sm text-muted-foreground">{existingRequest.old_email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Requested Email:</span>
                <span className="text-sm text-muted-foreground">{existingRequest.new_email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="secondary">{existingRequest.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Requested:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(existingRequest.created_at).toLocaleDateString()}
                </span>
              </div>
              {existingRequest.reason && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Reason:</span>
                  <p className="text-sm text-muted-foreground">{existingRequest.reason}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> This action will change the user's login email address. 
                Ensure the new email address is valid and belongs to the intended user.
              </AlertDescription>
            </Alert>

            <Alert>
              {securityInfo.icon}
              <AlertDescription>
                <strong>{securityInfo.title}:</strong> {securityInfo.description}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input
                id="currentEmail"
                value={currentEmail}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address *</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional: Explain why this email change is needed"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !newEmail || newEmail === currentEmail}
              >
                {isSubmitting ? "Submitting..." : "Request Email Change"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {existingRequest && (
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};