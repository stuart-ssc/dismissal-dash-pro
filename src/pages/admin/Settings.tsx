import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, School, Bell, Shield, Clock, Monitor, Calendar, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { TimePicker } from "@/components/ui/time-picker";

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

const schoolFormSchema = z.object({
  school_name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  primary_color: z.string().min(1, "Primary color is required"),
  secondary_color: z.string().min(1, "Secondary color is required"),
});

interface SchoolData {
  id: number;
  school_name: string;
  address?: string;
  phone_number?: string;
  primary_color: string;
  secondary_color: string;
  school_logo?: string;
  classroom_mode_layout?: string;
}

const Settings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [classroomLayout, setClassroomLayout] = useState<string>('transportation-columns');
  const [dismissalSettings, setDismissalSettings] = useState({
    dismissalTime: '15:30',
    preparationMinutes: 30,
    autoDismissalEnabled: false
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessionFormData, setSessionFormData] = useState({
    session_name: '',
    session_code: '',
    session_type: 'schoolYear',
    start_date: '',
    end_date: '',
    is_active: false,
  });

  const form = useForm<z.infer<typeof schoolFormSchema>>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      school_name: "",
      address: "",
      phone_number: "",
      primary_color: "#3B82F6",
      secondary_color: "#EF4444",
    },
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'school_admin')) {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchSchoolData();
  }, [user]);

  useEffect(() => {
    if (schoolData) {
      fetchSessions();
    }
  }, [schoolData]);

  const fetchSchoolData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profile?.school_id) {
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .maybeSingle();

        if (schoolError) {
          console.error('Error fetching school:', schoolError);
          return;
        }

        if (school) {
          setSchoolData(school as SchoolData);
          setClassroomLayout(school.classroom_mode_layout || 'transportation-columns');
          setDismissalSettings({
            dismissalTime: school.dismissal_time || '15:30',
            preparationMinutes: school.preparation_time_minutes || 30,
            autoDismissalEnabled: school.auto_dismissal_enabled || false
          });
          form.reset({
            school_name: school.school_name || "",
            address: school.address || "",
            phone_number: school.phone_number || "",
            primary_color: school.primary_color || "#3B82F6",
            secondary_color: school.secondary_color || "#EF4444",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof schoolFormSchema>) => {
    if (!schoolData) return;

    try {
    const { error } = await supabase
      .from('schools')
      .update({
        school_name: values.school_name,
        address: values.address,
        phone_number: values.phone_number,
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolData.id);

      if (error) {
        console.error('Error updating school:', error);
        toast.error('Failed to update school information');
        return;
      }

      toast.success('School information updated successfully');
      await fetchSchoolData(); // Refresh data
    } catch (error) {
      console.error('Error updating school:', error);
      toast.error('Failed to update school information');
    }
  };

  const handleClassroomLayoutChange = async (value: string) => {
    if (!schoolData) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({ classroom_mode_layout: value })
        .eq('id', schoolData.id);

      if (error) {
        console.error('Error updating classroom layout:', error);
        toast.error('Failed to update classroom layout');
        return;
      }

      setClassroomLayout(value);
      toast.success('Classroom layout preference updated');
    } catch (error) {
      console.error('Error updating classroom layout:', error);
      toast.error('Failed to update classroom layout');
    }
  };

  const handleSaveDismissalSettings = async () => {
    if (!schoolData) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          dismissal_time: dismissalSettings.dismissalTime,
          preparation_time_minutes: dismissalSettings.preparationMinutes,
          auto_dismissal_enabled: dismissalSettings.autoDismissalEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolData.id);

      if (error) {
        console.error('Error updating dismissal settings:', error);
        toast.error('Failed to update dismissal settings');
        return;
      }

      toast.success('Dismissal settings updated successfully');
      await fetchSchoolData();
    } catch (error) {
      console.error('Error updating dismissal settings:', error);
      toast.error('Failed to update dismissal settings');
    }
  };

  const fetchSessions = async () => {
    if (!schoolData) return;
    
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('school_id', schoolData.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load academic sessions');
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSession) {
        const { error } = await supabase
          .from('academic_sessions')
          .update(sessionFormData)
          .eq('id', editingSession.id);

        if (error) throw error;
        toast.success('Session updated successfully');
      } else {
        const { error } = await supabase
          .from('academic_sessions')
          .insert({
            ...sessionFormData,
            school_id: schoolData.id,
          });

        if (error) throw error;
        toast.success('Session created successfully');
      }

      setDialogOpen(false);
      setEditingSession(null);
      setSessionFormData({
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

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setSessionFormData({
      session_name: session.session_name,
      session_code: session.session_code,
      session_type: session.session_type,
      start_date: session.start_date,
      end_date: session.end_date,
      is_active: session.is_active,
    });
    setDialogOpen(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
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

  const handleToggleSessionActive = async (sessionId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await supabase
          .from('academic_sessions')
          .update({ is_active: false })
          .eq('school_id', schoolData.id)
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
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'school_admin') {
    return null;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your school's dismissal system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              School Information
            </CardTitle>
            <CardDescription>Update your school's basic information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter school name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter school address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input type="color" className="w-16 h-10" {...field} />
                            <Input placeholder="#3B82F6" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input type="color" className="w-16 h-10" {...field} />
                            <Input placeholder="#EF4444" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              Dismissal Settings
            </CardTitle>
            <CardDescription>Configure dismissal times and procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dismissal-time">Default Dismissal Time</Label>
              <TimePicker
                value={dismissalSettings.dismissalTime}
                onChange={(value) => setDismissalSettings({...dismissalSettings, dismissalTime: value})}
                placeholder="Pick dismissal time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep-time">Preparation Time (minutes)</Label>
              <Input 
                id="prep-time" 
                type="number" 
                placeholder="30" 
                value={dismissalSettings.preparationMinutes}
                onChange={(e) => setDismissalSettings({...dismissalSettings, preparationMinutes: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">
                How many minutes before dismissal should preparation mode start
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-dismissal" 
                checked={dismissalSettings.autoDismissalEnabled}
                onCheckedChange={(checked) => setDismissalSettings({...dismissalSettings, autoDismissalEnabled: checked})}
              />
              <Label htmlFor="auto-dismissal">Enable automatic dismissal announcements</Label>
            </div>
            
            <Button onClick={handleSaveDismissalSettings} className="w-full">Save Settings</Button>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              Classroom Display
            </CardTitle>
            <CardDescription>Configure how teachers see dismissal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="classroom-layout">Default Classroom Layout</Label>
              <Select value={classroomLayout} onValueChange={handleClassroomLayoutChange}>
                <SelectTrigger id="classroom-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transportation-columns">
                    Student View (Transportation Columns)
                  </SelectItem>
                  <SelectItem value="group-view">
                    Group View (Dismissal Groups)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Teachers can override this setting per session. Student View organizes students by transportation type for easy visibility on projectors.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card - Hidden until functionality is built */}
        {/* <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Notifications
            </CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="email-notifications" defaultChecked />
              <Label htmlFor="email-notifications">Email notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="sms-notifications" />
              <Label htmlFor="sms-notifications">SMS notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="parent-notifications" defaultChecked />
              <Label htmlFor="parent-notifications">Parent notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="emergency-alerts" defaultChecked />
              <Label htmlFor="emergency-alerts">Emergency alerts</Label>
            </div>
            <Button>Update Preferences</Button>
          </CardContent>
        </Card> */}

        {/* Security & Privacy Card - Hidden until functionality is built */}
        {/* <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Manage security settings and data privacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="two-factor" />
              <Label htmlFor="two-factor">Require two-factor authentication</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="session-timeout" defaultChecked />
              <Label htmlFor="session-timeout">Automatic session timeout</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="audit-logs" defaultChecked />
              <Label htmlFor="audit-logs">Enable audit logging</Label>
            </div>
            <Button>Update Security Settings</Button>
          </CardContent>
        </Card> */}

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Academic Sessions
                </CardTitle>
                <CardDescription>Manage school years, semesters, and terms</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingSession(null);
                    setSessionFormData({
                      session_name: '',
                      session_code: '',
                      session_type: 'schoolYear',
                      start_date: '',
                      end_date: '',
                      is_active: false,
                    });
                  }}>
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
                  <form onSubmit={handleSessionSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="session_name">Session Name</Label>
                      <Input
                        id="session_name"
                        placeholder="e.g., 2024-2025 School Year"
                        value={sessionFormData.session_name}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, session_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_code">Session Code</Label>
                      <Input
                        id="session_code"
                        placeholder="e.g., SY2024-2025"
                        value={sessionFormData.session_code}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, session_code: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_type">Session Type</Label>
                      <Select 
                        value={sessionFormData.session_type} 
                        onValueChange={(v) => setSessionFormData({ ...sessionFormData, session_type: v })}
                      >
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
                          value={sessionFormData.start_date}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, start_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={sessionFormData.end_date}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, end_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={sessionFormData.is_active}
                        onCheckedChange={(checked) => setSessionFormData({ ...sessionFormData, is_active: checked })}
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
                          onCheckedChange={(checked) => handleToggleSessionActive(session.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSession(session)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSession(session.id)}>
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
    </div>
  );
};

export default Settings;