import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Plus, Edit, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AcademicSessions = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    session_name: '',
    session_code: '',
    session_type: 'schoolYear',
    start_date: '',
    end_date: '',
    is_active: false,
  });

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
      fetchSessions();
    }
  }, [schoolId]);

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

  const fetchSessions = async () => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load academic sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSession) {
        const { error } = await supabase
          .from('academic_sessions')
          .update(formData)
          .eq('id', editingSession.id);

        if (error) throw error;
        toast.success('Session updated successfully');
      } else {
        const { error } = await supabase
          .from('academic_sessions')
          .insert({
            ...formData,
            school_id: schoolId,
          });

        if (error) throw error;
        toast.success('Session created successfully');
      }

      setDialogOpen(false);
      setEditingSession(null);
      setFormData({
        session_name: '',
        session_code: '',
        session_type: 'schoolYear',
        start_date: '',
        end_date: '',
        is_active: false,
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error(error.message || 'Failed to save session');
    }
  };

  const handleEdit = (session: any) => {
    setEditingSession(session);
    setFormData({
      session_name: session.session_name,
      session_code: session.session_code,
      session_type: session.session_type,
      start_date: session.start_date,
      end_date: session.end_date,
      is_active: session.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this academic session?')) return;

    try {
      const { error } = await supabase
        .from('academic_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success('Session deleted successfully');
      fetchSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.message || 'Failed to delete session');
    }
  };

  const handleToggleActive = async (sessionId: string, isActive: boolean) => {
    try {
      // If activating, deactivate all others
      if (isActive) {
        await supabase
          .from('academic_sessions')
          .update({ is_active: false })
          .eq('school_id', schoolId)
          .neq('id', sessionId);
      }

      const { error } = await supabase
        .from('academic_sessions')
        .update({ is_active: isActive })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success(isActive ? 'Session activated' : 'Session deactivated');
      fetchSessions();
    } catch (error: any) {
      console.error('Error toggling active status:', error);
      toast.error(error.message || 'Failed to update session');
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
            <Calendar className="h-8 w-8" />
            Academic Sessions
          </h1>
          <p className="text-muted-foreground">Manage school years, semesters, and terms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSession ? 'Edit Session' : 'Create Session'}</DialogTitle>
              <DialogDescription>
                Define a new academic time period for your school
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session_name">Session Name</Label>
                <Input
                  id="session_name"
                  placeholder="e.g., 2024-2025 School Year"
                  value={formData.session_name}
                  onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_code">Session Code</Label>
                <Input
                  id="session_code"
                  placeholder="e.g., SY2024-2025"
                  value={formData.session_code}
                  onChange={(e) => setFormData({ ...formData, session_code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_type">Session Type</Label>
                <Select value={formData.session_type} onValueChange={(v) => setFormData({ ...formData, session_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schoolYear">School Year</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="term">Term</SelectItem>
                    <SelectItem value="gradingPeriod">Grading Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Set as active session</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingSession ? 'Update' : 'Create'} Session
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic Sessions</CardTitle>
          <CardDescription>All academic time periods for your school</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No academic sessions found
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id} className={session.is_active ? 'bg-green-50 dark:bg-green-950' : ''}>
                    <TableCell className="font-medium">{session.session_name}</TableCell>
                    <TableCell>{session.session_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.session_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.start_date), 'MMM dd, yyyy')} - {format(new Date(session.end_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {session.ic_external_id ? (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          IC Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={session.is_active}
                        onCheckedChange={(checked) => handleToggleActive(session.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(session)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(session.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademicSessions;
