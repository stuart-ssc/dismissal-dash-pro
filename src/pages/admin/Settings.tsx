import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, School, Bell, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";

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
  walkers_enabled?: boolean;
  car_lines_enabled?: boolean;
}

const Settings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Transportation Options</h4>
              
              {schoolData?.walkers_enabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Walker Locations</Label>
                    <p className="text-sm text-muted-foreground">Manage walker pickup locations</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard/walker-locations')}
                  >
                    Manage
                  </Button>
                </div>
              )}
              
              {schoolData?.car_lines_enabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Car Lines</Label>
                    <p className="text-sm text-muted-foreground">Manage car pickup lines</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard/car-lines')}
                  >
                    Manage
                  </Button>
                </div>
              )}
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
  );
};

export default Settings;