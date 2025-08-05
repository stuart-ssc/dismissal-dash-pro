import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Settings as SettingsIcon, School, Bell, Shield, Clock, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";

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
}

const Settings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

          // Set logo URL if exists
          if (school.school_logo) {
            const { data } = supabase.storage
              .from('school-logos')
              .getPublicUrl(school.school_logo);
            setLogoUrl(data.publicUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!schoolData) return;

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${schoolData.id}-logo.${fileExt}`;
      const filePath = `${schoolData.id}/${fileName}`;

      // Delete existing logo if it exists
      if (schoolData.school_logo) {
        await supabase.storage
          .from('school-logos')
          .remove([schoolData.school_logo]);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        toast.error('Failed to upload logo');
        return;
      }

      // Update school record with new logo path
      const { error: updateError } = await supabase
        .from('schools')
        .update({ school_logo: filePath })
        .eq('id', schoolData.id);

      if (updateError) {
        console.error('Error updating school logo:', updateError);
        toast.error('Failed to save logo');
        return;
      }

      // Get public URL for display
      const { data } = supabase.storage
        .from('school-logos')
        .getPublicUrl(filePath);
      
      setLogoUrl(data.publicUrl);
      setSchoolData({ ...schoolData, school_logo: filePath });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      handleLogoUpload(file);
    }
  };

  const removeLogo = async () => {
    if (!schoolData?.school_logo) return;

    try {
      // Remove from storage
      await supabase.storage
        .from('school-logos')
        .remove([schoolData.school_logo]);

      // Update school record
      const { error } = await supabase
        .from('schools')
        .update({ school_logo: null })
        .eq('id', schoolData.id);

      if (error) {
        console.error('Error removing logo:', error);
        toast.error('Failed to remove logo');
        return;
      }

      setLogoUrl('');
      setLogoFile(null);
      setSchoolData({ ...schoolData, school_logo: undefined });
      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
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
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold">{schoolData?.school_name || 'Settings'}</h1>
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
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* Logo Upload Section */}
                      <div className="space-y-2">
                        <Label>School Logo</Label>
                        <div className="flex items-center gap-4">
                          {logoUrl ? (
                            <div className="relative">
                              <img 
                                src={logoUrl} 
                                alt="School logo" 
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={removeLogo}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                            </Button>
                            {logoFile && (
                              <p className="text-sm text-muted-foreground">
                                {logoFile.name}
                              </p>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                      </div>

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
                              <Input placeholder="Enter phone number" {...field} />
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
                  <div className="flex items-center space-x-2">
                    <Switch id="enable-walkers" defaultChecked />
                    <Label htmlFor="enable-walkers">Enable Walkers</Label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch id="enable-car-lines" defaultChecked />
                      <Label htmlFor="enable-car-lines">Enable Car Lines</Label>
                    </div>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => navigate('/dashboard/car-lines')}
                      className="h-auto p-0 text-primary hover:text-primary/80"
                    >
                      Manage Car Lines
                    </Button>
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