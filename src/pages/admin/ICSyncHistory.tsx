import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

const ICSyncHistory = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!loading && (!user || userRole !== 'school_admin')) {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchSchoolId();
  }, [user]);

  useEffect(() => {
    if (schoolId) {
      fetchSyncLogs();
    }
  }, [schoolId, statusFilter]);

  const fetchSchoolId = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
    
    if (profile?.school_id) {
      setSchoolId(profile.school_id);
    }
  };

  const fetchSyncLogs = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('ic_sync_logs')
        .select('*', { count: 'exact' })
        .eq('school_id', schoolId)
        .order('started_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'Running...';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Error</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const paginatedLogs = syncLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(syncLogs.length / itemsPerPage);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Sync History
          </h1>
          <p className="text-muted-foreground">View all Infinite Campus synchronization attempts</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
          ← Back to Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Synchronization Logs</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Success</SelectItem>
                  <SelectItem value="failed">Error</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No sync logs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.started_at), 'MMM dd, yyyy \'at\' h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.sync_type === 'manual' ? 'default' : 'secondary'}>
                        {log.sync_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{getDuration(log.started_at, log.completed_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Students: +{log.students_created} ~{log.students_updated} -{log.students_archived}</div>
                        <div>Teachers: +{log.teachers_created} ~{log.teachers_updated}</div>
                        <div>Classes: +{log.classes_created} ~{log.classes_updated}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.started_at), 'MMMM dd, yyyy \'at\' h:mm a')}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <Badge variant={selectedLog.sync_type === 'manual' ? 'default' : 'secondary'}>
                    {selectedLog.sync_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm">{getDuration(selectedLog.started_at, selectedLog.completed_at)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Full Statistics</h4>
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Students Created</p>
                      <p className="text-lg font-bold">{selectedLog.students_created}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Students Updated</p>
                      <p className="text-lg font-bold">{selectedLog.students_updated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Students Archived</p>
                      <p className="text-lg font-bold">{selectedLog.students_archived}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teachers Created</p>
                      <p className="text-lg font-bold">{selectedLog.teachers_created}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teachers Updated</p>
                      <p className="text-lg font-bold">{selectedLog.teachers_updated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Classes Created</p>
                      <p className="text-lg font-bold">{selectedLog.classes_created}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-destructive">Error Details</h4>
                  <div className="rounded-lg border border-destructive p-4 bg-destructive/10">
                    <p className="text-sm">{selectedLog.error_message}</p>
                    {selectedLog.error_details && (
                      <pre className="text-xs mt-2 overflow-x-auto">
                        {JSON.stringify(selectedLog.error_details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Metadata</h4>
                  <pre className="text-xs rounded-lg border p-4 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ICSyncHistory;
