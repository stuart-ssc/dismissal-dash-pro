import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Building2, Calendar, Copy } from "lucide-react";
import { format } from "date-fns";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'archived';
  created_at: string;
  updated_at: string;
}

interface ContactSubmissionDetailProps {
  submission: ContactSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onCopyEmail: (email: string) => void;
}

export function ContactSubmissionDetail({
  submission,
  open,
  onOpenChange,
  onStatusChange,
  onCopyEmail,
}: ContactSubmissionDetailProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'outline';
      case 'archived': return 'outline';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'New';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Submission Details</DialogTitle>
          <DialogDescription>
            Review and manage this contact form submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-3">
              <Badge variant={getStatusBadgeVariant(submission.status)}>
                {getStatusLabel(submission.status)}
              </Badge>
              <Select
                value={submission.status}
                onValueChange={(value) => onStatusChange(submission.id, value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact Information</h3>
            
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium">{submission.name}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{submission.email}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopyEmail(submission.email)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {submission.phone && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{submission.phone}</p>
                  </div>
                </div>
              )}

              {submission.organization && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Organization</Label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{submission.organization}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <div className="rounded-md border p-4 bg-muted/50">
              <p className="whitespace-pre-wrap text-sm">{submission.message}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Submitted</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">
                {format(new Date(submission.updated_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open(`mailto:${submission.email}`, '_blank')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
