import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Clock, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";

interface EmailChangeRequest {
  id: string;
  user_id: string;
  old_email: string;
  new_email: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
  reason?: string;
  notes?: string;
  requester: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target_user: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const EmailManagementDashboard = () => {
  const [requests, setRequests] = useState<EmailChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    request: EmailChangeRequest | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, request: null, action: null });
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const { session } = useAuth();

  const fetchRequests = async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('secure-email-change/list', {
        body: { status: selectedStatus },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setRequests(data.requests || []);
    } catch (error: any) {
      console.error('Error fetching email requests:', error);
      toast({
        title: "Error",
        description: "Failed to load email change requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedStatus, session]);

  const handleAction = async () => {
    if (!actionDialog.request || !actionDialog.action || !session?.access_token) return;

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('secure-email-change/approve', {
        body: {
          requestId: actionDialog.request.id,
          action: actionDialog.action,
          notes: actionNotes || null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || `Request ${actionDialog.action}d successfully.`
      });

      setActionDialog({ open: false, request: null, action: null });
      setActionNotes('');
      fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process request.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Change Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by status:</span>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchRequests} variant="outline">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading email change requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {selectedStatus} email change requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {request.target_user.first_name} {request.target_user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.target_user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">From:</span> {request.old_email}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">To:</span> {request.new_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusVariant(request.status)}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(request.status)}
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && isExpired(request.expires_at) && (
                          <div className="text-xs text-destructive mt-1">
                            Expired
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.requester.first_name} {request.requester.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && !isExpired(request.expires_at) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActionDialog({
                                open: true,
                                request,
                                action: 'approve'
                              })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActionDialog({
                                open: true,
                                request,
                                action: 'reject'
                              })}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.reason && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                            Reason: {request.reason}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, request: null, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {actionDialog.action === 'approve' ? 'Approve' : 'Reject'} Email Change
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve' 
                ? 'This will immediately change the user\'s email address.'
                : 'This will reject the email change request.'
              }
            </DialogDescription>
          </DialogHeader>

          {actionDialog.request && (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>User:</strong> {actionDialog.request.target_user.first_name} {actionDialog.request.target_user.last_name}<br />
                  <strong>Current Email:</strong> {actionDialog.request.old_email}<br />
                  <strong>New Email:</strong> {actionDialog.request.new_email}
                </AlertDescription>
              </Alert>

              {actionDialog.request.reason && (
                <div>
                  <label className="text-sm font-medium">Request Reason:</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {actionDialog.request.reason}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="actionNotes" className="text-sm font-medium">
                  Notes (Optional)
                </label>
                <Textarea
                  id="actionNotes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={`Add notes for this ${actionDialog.action} action...`}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ open: false, request: null, action: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              disabled={isProcessing}
              variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing ? 'Processing...' : (actionDialog.action === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};