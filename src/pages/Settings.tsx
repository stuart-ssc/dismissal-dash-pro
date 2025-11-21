import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { Settings as SettingsIcon, School, Bell, Shield, Clock, Upload, X, Calendar, Plus, Edit, Trash2, CheckCircle2, GraduationCap, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";

const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Apply formatting based on length
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
});

const dismissalFormSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  preparation_time_minutes: z.number().min(1).max(60),
  auto_dismissal_enabled: z.boolean(),
});

const notificationFormSchema = z.object({
  email_notifications_enabled: z.boolean(),
  sms_notifications_enabled: z.boolean(),
  parent_notifications_enabled: z.boolean(),
  emergency_alerts_enabled: z.boolean(),
});

const securityFormSchema = z.object({
  two_factor_required: z.boolean(),
  session_timeout_enabled: z.boolean(),
  audit_logs_enabled: z.boolean(),
});

interface SchoolData {
  id: number;
  school_name: string;
  address?: string;
  phone_number?: string;
  school_logo?: string;
  timezone?: string;
  preparation_time_minutes?: number;
  auto_dismissal_enabled?: boolean;
  email_notifications_enabled?: boolean;
  sms_notifications_enabled?: boolean;
  parent_notifications_enabled?: boolean;
  emergency_alerts_enabled?: boolean;
  two_factor_required?: boolean;
  session_timeout_enabled?: boolean;
  audit_logs_enabled?: boolean;
}

// Common US timezones
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

// Get browser timezone as default
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // fallback
  }
};

const Settings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    },
  });

  const dismissalForm = useForm<z.infer<typeof dismissalFormSchema>>({
    resolver: zodResolver(dismissalFormSchema),
    defaultValues: {
      timezone: getBrowserTimezone(),
      preparation_time_minutes: 5,
      auto_dismissal_enabled: false,
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
      parent_notifications_enabled: true,
      emergency_alerts_enabled: true,
    },
  });

  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      two_factor_required: false,
      session_timeout_enabled: false,
      audit_logs_enabled: true,
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();

  useEffect(() => {
    if (schoolId && !isLoadingSchoolId) {
      fetchSchoolData();
    }
  }, [schoolId, isLoadingSchoolId]);

  useEffect(() => {
    if (schoolData) {
      fetchSessions();
    }
  }, [schoolData]);

  const fetchSchoolData = async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);
      
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
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
        });

        dismissalForm.reset({
          timezone: school.timezone || getBrowserTimezone(),
          preparation_time_minutes: school.preparation_time_minutes || 5,
          auto_dismissal_enabled: school.auto_dismissal_enabled || false,
        });

        notificationForm.reset({
          email_notifications_enabled: school.email_notifications_enabled !== false,
          sms_notifications_enabled: school.sms_notifications_enabled || false,
          parent_notifications_enabled: school.parent_notifications_enabled !== false,
          emergency_alerts_enabled: school.emergency_alerts_enabled !== false,
        });

        securityForm.reset({
          two_factor_required: school.two_factor_required || false,
          session_timeout_enabled: school.session_timeout_enabled || false,
          audit_logs_enabled: school.audit_logs_enabled !== false,
        });

        // Set logo URL if exists
        if (school.school_logo) {
          const { data } = supabase.storage
            .from('school-logos')
            .getPublicUrl(school.school_logo);
          setLogoUrl(data.publicUrl);
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
        .update({ school_logo: filePath, updated_at: new Date().toISOString() })
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
        .update({ school_logo: null, updated_at: new Date().toISOString() })
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

  const onDismissalSubmit = async (values: z.infer<typeof dismissalFormSchema>) => {
    if (!schoolData) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          timezone: values.timezone,
          preparation_time_minutes: values.preparation_time_minutes,
          auto_dismissal_enabled: values.auto_dismissal_enabled,
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

  const onNotificationSubmit = async (values: z.infer<typeof notificationFormSchema>) => {
    if (!schoolData) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          email_notifications_enabled: values.email_notifications_enabled,
          sms_notifications_enabled: values.sms_notifications_enabled,
          parent_notifications_enabled: values.parent_notifications_enabled,
          emergency_alerts_enabled: values.emergency_alerts_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolData.id);

      if (error) {
        console.error('Error updating notification settings:', error);
        toast.error('Failed to update notification settings');
        return;
      }

      toast.success('Notification settings updated successfully');
      await fetchSchoolData();
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  const onSecuritySubmit = async (values: z.infer<typeof securityFormSchema>) => {
    if (!schoolData) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          two_factor_required: values.two_factor_required,
          session_timeout_enabled: values.session_timeout_enabled,
          audit_logs_enabled: values.audit_logs_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolData.id);

      if (error) {
        console.error('Error updating security settings:', error);
        toast.error('Failed to update security settings');
        return;
      }

      toast.success('Security settings updated successfully');
      await fetchSchoolData();
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error('Failed to update security settings');
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
    <>
      <SEO />
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
                  <CardDescription>Configure school timezone and dismissal procedures. Dismissal times are managed through dismissal plans.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...dismissalForm}>
                    <form onSubmit={dismissalForm.handleSubmit(onDismissalSubmit)} className="space-y-4">
                      <FormField
                        control={dismissalForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background z-[60]">
                                {TIMEZONE_OPTIONS.map((timezone) => (
                                  <SelectItem key={timezone.value} value={timezone.value}>
                                    {timezone.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dismissalForm.control}
                        name="preparation_time_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preparation Time (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="5" 
                                min="1" 
                                max="60"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dismissalForm.control}
                        name="auto_dismissal_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Enable automatic dismissal announcements</FormLabel>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">
                        Save Settings
                      </Button>
                    </form>
                  </Form>
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
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="email_notifications_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Email notifications</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="sms_notifications_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>SMS notifications</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="parent_notifications_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Parent notifications</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="emergency_alerts_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Emergency alerts</FormLabel>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">
                        Update Preferences
                      </Button>
                    </form>
                  </Form>
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
                <CardContent>
                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                      <FormField
                        control={securityForm.control}
                        name="two_factor_required"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Require two-factor authentication</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={securityForm.control}
                        name="session_timeout_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Automatic session timeout</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={securityForm.control}
                        name="audit_logs_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Enable audit logging</FormLabel>
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">
                        Save Settings
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card> */}

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
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

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Year-End Rollover
                  </CardTitle>
                  <CardDescription>
                    Archive the current academic year and set up the next school year
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Use this wizard at the end of the school year to transition to a new academic year. 
                      The wizard will guide you through validation, archiving current data, and setting up the new session.
                    </p>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This process should only be performed once per year when transitioning to a new school year. 
                      Make sure all dismissal runs are completed before starting.
                    </AlertDescription>
                  </Alert>

                  <Button onClick={() => navigate('/dashboard/year-end-rollover')} className="w-full sm:w-auto">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Start Year-End Rollover Wizard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
    </>
  );
};

export default Settings;