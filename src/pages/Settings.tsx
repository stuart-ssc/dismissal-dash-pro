import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Settings as SettingsIcon, School, Bell, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && userRole !== 'school_admin') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchSchoolName();
  }, [user]);

  const fetchSchoolName = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profile?.school_id) {
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('school_name')
          .eq('id', profile.school_id)
          .single();

        if (schoolError) {
          console.error('Error fetching school:', schoolError);
          return;
        }

        setSchoolName(school?.school_name || 'Settings');
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    } finally {
      setIsLoading(false);
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
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold">{schoolName || 'Settings'}</h1>
                <p className="text-sm text-muted-foreground">
                  Configure your school's dismissal system preferences
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    School Information
                  </CardTitle>
                  <CardDescription>Update your school's basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name</Label>
                    <Input id="school-name" placeholder="Enter school name" defaultValue="Lincoln Elementary School" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-address">Address</Label>
                    <Input id="school-address" placeholder="Enter school address" defaultValue="123 Main Street, City, State" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-phone">Phone Number</Label>
                    <Input id="school-phone" placeholder="Enter phone number" defaultValue="(555) 123-4567" />
                  </div>
                  <Button>Save Changes</Button>
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
                    <Input id="dismissal-time" type="time" defaultValue="15:30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prep-time">Preparation Time (minutes)</Label>
                    <Input id="prep-time" type="number" placeholder="15" defaultValue="15" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-dismissal" defaultChecked />
                    <Label htmlFor="auto-dismissal">Enable automatic dismissal announcements</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="enable-walkers" defaultChecked />
                    <Label htmlFor="enable-walkers">Enable Walkers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="enable-car-lines" defaultChecked />
                    <Label htmlFor="enable-car-lines">Enable Car Lines</Label>
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
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
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
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
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Settings;