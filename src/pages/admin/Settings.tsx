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
import { Settings as SettingsIcon, School, Bell, Shield, Clock, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { TimePicker } from "@/components/ui/time-picker";
import { ICConnectionForm } from "@/components/ICConnectionForm";
import { ICConnectionStatus } from "@/components/ICConnectionStatus";
import { Database } from "lucide-react";

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
  const [icConnection, setIcConnection] = useState<any>(null);
  const [dismissalSettings, setDismissalSettings] = useState({
    dismissalTime: '15:30',
    preparationMinutes: 30,
    autoDismissalEnabled: false
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
    fetchICConnection();
  }, [user]);

  const fetchICConnection = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
    
    if (profile?.school_id) {
      const { data } = await supabase
        .from('infinite_campus_connections')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('status', 'active')
        .maybeSingle();
      
      setIcConnection(data);
    }
  };

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
              <Database className="h-5 w-5 text-blue-500" />
              Infinite Campus Integration
            </CardTitle>
            <CardDescription>Sync students, teachers, and classes from your Infinite Campus SIS</CardDescription>
          </CardHeader>
          <CardContent>
            {!icConnection ? (
              <ICConnectionForm schoolId={schoolData?.id || 0} onConnectionSuccess={fetchICConnection} />
            ) : (
              <ICConnectionStatus connection={icConnection} onDisconnect={fetchICConnection} />
            )}
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
            <Button variant="outline">View Security Logs</Button>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
};

export default Settings;