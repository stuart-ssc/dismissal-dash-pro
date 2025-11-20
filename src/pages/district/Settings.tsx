import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { Settings as SettingsIcon, Building2, Globe, Shield, Loader2 } from "lucide-react";

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const districtInfoSchema = z.object({
  district_name: z.string().min(1, "District name is required"),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid zipcode format").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

const defaultSettingsSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

const overridePermissionsSchema = z.object({
  allow_school_timezone_override: z.boolean(),
  allow_school_dismissal_time_override: z.boolean(),
  allow_school_colors_override: z.boolean(),
});

type DistrictInfoFormValues = z.infer<typeof districtInfoSchema>;
type DefaultSettingsFormValues = z.infer<typeof defaultSettingsSchema>;
type OverridePermissionsFormValues = z.infer<typeof overridePermissionsSchema>;

export default function DistrictSettings() {
  const { district, isLoading: districtLoading } = useDistrictAuth();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const districtInfoForm = useForm<DistrictInfoFormValues>({
    resolver: zodResolver(districtInfoSchema),
    defaultValues: {
      district_name: "",
      street_address: "",
      city: "",
      state: "",
      zipcode: "",
      phone_number: "",
      email: "",
      website: "",
    },
  });

  const defaultSettingsForm = useForm<DefaultSettingsFormValues>({
    resolver: zodResolver(defaultSettingsSchema),
    defaultValues: {
      timezone: "America/New_York",
    },
  });

  const overridePermissionsForm = useForm<OverridePermissionsFormValues>({
    resolver: zodResolver(overridePermissionsSchema),
    defaultValues: {
      allow_school_timezone_override: true,
      allow_school_dismissal_time_override: true,
      allow_school_colors_override: true,
    },
  });

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return value;
    const [, area, prefix, line] = match;
    if (line) return `(${area}) ${prefix}-${line}`;
    if (prefix) return `(${area}) ${prefix}`;
    if (area) return `(${area}`;
    return "";
  };

  useEffect(() => {
    const fetchDistrictData = async () => {
      if (!district?.id) return;

      setIsLoadingData(true);
      try {
        const { data, error } = await supabase
          .from("districts")
          .select("*")
          .eq("id", district.id)
          .single();

        if (error) throw error;

        if (data) {
          districtInfoForm.reset({
            district_name: data.district_name || "",
            street_address: data.street_address || "",
            city: data.city || "",
            state: data.state || "",
            zipcode: data.zipcode || "",
            phone_number: data.phone_number || "",
            email: data.email || "",
            website: data.website || "",
          });

          defaultSettingsForm.reset({
            timezone: data.timezone || "America/New_York",
          });

          overridePermissionsForm.reset({
            allow_school_timezone_override: data.allow_school_timezone_override ?? true,
            allow_school_dismissal_time_override: data.allow_school_dismissal_time_override ?? true,
            allow_school_colors_override: data.allow_school_colors_override ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching district data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load district settings",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDistrictData();
  }, [district?.id]);

  const onSubmitDistrictInfo = async (values: DistrictInfoFormValues) => {
    if (!district?.id) return;

    setIsSavingInfo(true);
    try {
      const { error } = await supabase
        .from("districts")
        .update({
          district_name: values.district_name,
          street_address: values.street_address || null,
          city: values.city || null,
          state: values.state || null,
          zipcode: values.zipcode || null,
          phone_number: values.phone_number || null,
          email: values.email || null,
          website: values.website || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", district.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "District information updated successfully",
      });
    } catch (error) {
      console.error("Error updating district info:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update district information",
      });
    } finally {
      setIsSavingInfo(false);
    }
  };

  const onSubmitDefaultSettings = async (values: DefaultSettingsFormValues) => {
    if (!district?.id) return;

    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("districts")
        .update({
          timezone: values.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", district.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating default settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update default settings",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const onSubmitOverridePermissions = async (values: OverridePermissionsFormValues) => {
    if (!district?.id) return;

    setIsSavingPermissions(true);
    try {
      const { error } = await supabase
        .from("districts")
        .update({
          allow_school_timezone_override: values.allow_school_timezone_override,
          allow_school_dismissal_time_override: values.allow_school_dismissal_time_override,
          allow_school_colors_override: values.allow_school_colors_override,
          updated_at: new Date().toISOString(),
        })
        .eq("id", district.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Override permissions updated successfully",
      });
    } catch (error) {
      console.error("Error updating override permissions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update override permissions",
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  if (districtLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Information */}
        <Card className="shadow-elevated border-0 bg-card backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle>District Information</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Basic information about your school district
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...districtInfoForm}>
              <form onSubmit={districtInfoForm.handleSubmit(onSubmitDistrictInfo)} className="space-y-4">
                <FormField
                  control={districtInfoForm.control}
                  name="district_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter district name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={districtInfoForm.control}
                  name="street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={districtInfoForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={districtInfoForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={districtInfoForm.control}
                  name="zipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zipcode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={districtInfoForm.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(555) 123-4567"
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={districtInfoForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@district.edu" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={districtInfoForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://www.district.edu" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSavingInfo} className="w-full">
                  {isSavingInfo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Information
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card className="shadow-elevated border-0 bg-card backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle>Default Settings</CardTitle>
            </div>
            <CardDescription className="mt-2">
              District-wide default settings for all schools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...defaultSettingsForm}>
              <form onSubmit={defaultSettingsForm.handleSubmit(onSubmitDefaultSettings)} className="space-y-4">
                <FormField
                  control={defaultSettingsForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Default timezone for all schools in your district. Schools can override this if permitted.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSavingSettings} className="w-full">
                  {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* School Override Permissions */}
        <Card className="shadow-elevated border-0 bg-card backdrop-blur lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>School Override Permissions</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Control which settings schools can customize independently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertDescription>
                When a permission is disabled, schools must use the district-wide default setting. School administrators will see these settings locked with a tooltip explaining they are managed by the district.
              </AlertDescription>
            </Alert>

            <Form {...overridePermissionsForm}>
              <form onSubmit={overridePermissionsForm.handleSubmit(onSubmitOverridePermissions)} className="space-y-6">
                <FormField
                  control={overridePermissionsForm.control}
                  name="allow_school_timezone_override"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow schools to set their own timezone</FormLabel>
                        <FormDescription>
                          Schools can choose a timezone different from the district default
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={overridePermissionsForm.control}
                  name="allow_school_dismissal_time_override"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow schools to set dismissal preparation times</FormLabel>
                        <FormDescription>
                          Schools can configure their own dismissal timing and preparation schedules
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={overridePermissionsForm.control}
                  name="allow_school_colors_override"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow schools to customize branding colors</FormLabel>
                        <FormDescription>
                          Schools can set their own school colors for the dismissal interface
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSavingPermissions} className="w-full">
                  {isSavingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Permissions
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
