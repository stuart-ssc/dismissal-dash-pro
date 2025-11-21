import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MoreVertical, Search, Mail, Phone, Building2, Calendar, FileText, Copy, CheckCircle, Clock, Archive } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import { ContactSubmissionDetail } from "@/components/ContactSubmissionDetail";

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

export default function ContactSubmissions() {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    document.title = "Contact Submissions | System Administration";
  }, []);

  // Role guard - system admins only
  useEffect(() => {
    if (!authLoading && userRole !== 'system_admin') {
      navigate('/admin');
    }
  }, [authLoading, userRole, navigate]);

  // Fetch submissions
  const { data, isLoading } = useQuery({
    queryKey: ['contact-submissions', statusFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('contact_submissions')
        .select('*', { count: 'exact' });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,organization.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(page * 25, (page + 1) * 25 - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      return { submissions: data as ContactSubmission[], total: count || 0 };
    },
    enabled: userRole === 'system_admin',
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      toast({ title: 'Status updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: 'Email copied to clipboard' });
  };

  const handleViewDetails = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setDetailOpen(true);
  };

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

  const totalPages = data ? Math.ceil(data.total / 25) : 0;

  if (authLoading) {
    return (
      <div className="flex-1 p-6">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <Navbar />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contact Submissions</h1>
          <p className="text-muted-foreground">
            Manage and respond to contact form inquiries
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Review and manage contact form submissions from your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, organization, or message..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !data?.submissions || data.submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No submissions found</p>
                  <p className="text-sm">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.submissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(submission.status)}>
                                {getStatusLabel(submission.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{submission.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {submission.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              {submission.organization ? (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  {submission.organization}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(submission.created_at), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(submission)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyEmail(submission.email)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Email
                                  </DropdownMenuItem>
                                  {submission.status !== 'in_progress' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'in_progress')}>
                                      <Clock className="mr-2 h-4 w-4" />
                                      Mark In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {submission.status !== 'resolved' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'resolved')}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark Resolved
                                    </DropdownMenuItem>
                                  )}
                                  {submission.status !== 'archived' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'archived')}>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {data.submissions.map((submission) => (
                      <Card key={submission.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{submission.name}</CardTitle>
                              <CardDescription className="text-sm flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3" />
                                {submission.email}
                              </CardDescription>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(submission)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyEmail(submission.email)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Email
                                </DropdownMenuItem>
                                {submission.status !== 'in_progress' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'in_progress')}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Mark In Progress
                                  </DropdownMenuItem>
                                )}
                                {submission.status !== 'resolved' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'resolved')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Mark Resolved
                                  </DropdownMenuItem>
                                )}
                                {submission.status !== 'archived' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(submission.id, 'archived')}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={getStatusBadgeVariant(submission.status)}>
                              {getStatusLabel(submission.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(submission.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {submission.organization && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {submission.organization}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {submission.message}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {page * 25 + 1} to {Math.min((page + 1) * 25, data.total)} of {data.total} submissions
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= totalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedSubmission && (
        <ContactSubmissionDetail
          submission={selectedSubmission}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onStatusChange={handleStatusChange}
          onCopyEmail={handleCopyEmail}
        />
      )}
    </div>
  );
}
