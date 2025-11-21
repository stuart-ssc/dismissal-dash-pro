import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSchoolId } from '@/hooks/useActiveSchoolId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Archive, Loader2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ArchivedUsers = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (schoolId && !isLoadingSchoolId) {
      fetchArchivedUsers();
    }
  }, [schoolId, isLoadingSchoolId]);

  const fetchArchivedUsers = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('school_id', schoolId)
          .eq('archived', true)
          .order('archived_at', { ascending: false }),
        supabase
          .from('teachers')
          .select('*')
          .eq('school_id', schoolId)
          .eq('archived', true)
          .order('archived_at', { ascending: false })
      ]);

      const students = (studentsRes.data || []).map(s => ({ ...s, type: 'Student' }));
      const teachers = (teachersRes.data || []).map(t => ({ ...t, type: 'Teacher' }));
      
      setArchivedUsers([...students, ...teachers]);
    } catch (error) {
      console.error('Error fetching archived users:', error);
      toast.error('Failed to load archived users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (userId: string, type: string) => {
    try {
      const table = type === 'Student' ? 'students' : 'teachers';
      const { error } = await supabase
        .from(table)
        .update({
          archived: false,
          archived_at: null,
          archived_by: null,
          archived_reason: null,
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`${type} restored successfully`);
      fetchArchivedUsers();
    } catch (error: any) {
      console.error('Error restoring user:', error);
      toast.error(error.message || 'Failed to restore user');
    }
  };

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
            <Archive className="h-8 w-8" />
            Archived Users
          </h1>
          <p className="text-muted-foreground">View and restore archived students and teachers</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/people')}>
          ← Back to People
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archived Users ({archivedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {archivedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No archived users</h3>
              <p className="text-sm text-muted-foreground">All students and teachers are currently active</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Archived Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Badge variant={user.type === 'Student' ? 'outline' : 'secondary'}>
                        {user.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>
                      {user.type === 'Student' ? user.grade_level : user.email}
                    </TableCell>
                    <TableCell>
                      {user.archived_at && format(new Date(user.archived_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.archived_reason || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(user.id, user.type)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedUsers;
