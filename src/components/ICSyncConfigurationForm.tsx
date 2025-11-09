import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BlackoutDatePicker } from "@/components/BlackoutDatePicker";

const syncConfigSchema = z.object({
  interval_type: z.enum(['hourly', 'daily', 'weekly', 'custom']),
  interval_value: z.number().min(1).max(168), // Max 1 week in hours
  custom_cron: z.string().optional(),
  sync_window_start: z.string().nullable(),
  sync_window_end: z.string().nullable(),
  timezone: z.string(),
  sync_students: z.boolean(),
  sync_teachers: z.boolean(),
  sync_classes: z.boolean(),
  sync_enrollments: z.boolean(),
  sync_courses: z.boolean(),
  sync_academic_sessions: z.boolean(),
  skip_weekends: z.boolean(),
  blackout_dates: z.array(z.string()),
});

type SyncConfigFormValues = z.infer<typeof syncConfigSchema>;

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

interface ICSyncConfigurationFormProps {
  schoolId: number;
  onConfigUpdated?: () => void;
}

export function ICSyncConfigurationForm({ schoolId, onConfigUpdated }: ICSyncConfigurationFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<SyncConfigFormValues>({
    resolver: zodResolver(syncConfigSchema),
    defaultValues: {
      interval_type: 'daily',
      interval_value: 1,
      custom_cron: '',
      sync_window_start: '02:00',
      sync_window_end: '06:00',
      timezone: 'America/New_York',
      sync_students: true,
      sync_teachers: true,
      sync_classes: true,
      sync_enrollments: true,
      sync_courses: true,
      sync_academic_sessions: true,
      skip_weekends: false,
      blackout_dates: [],
    },
  });

  const intervalType = form.watch('interval_type');

  useEffect(() => {
    fetchConfiguration();
  }, [schoolId]);

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ic_sync_configuration' as any)
        .select('*')
        .eq('school_id', schoolId)
        .single() as any;

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        form.reset({
          interval_type: data.interval_type as any,
          interval_value: data.interval_value,
          custom_cron: data.custom_cron || '',
          sync_window_start: data.sync_window_start || null,
          sync_window_end: data.sync_window_end || null,
          timezone: data.timezone,
          sync_students: data.sync_students,
          sync_teachers: data.sync_teachers,
          sync_classes: data.sync_classes,
          sync_enrollments: data.sync_enrollments,
          sync_courses: data.sync_courses,
          sync_academic_sessions: data.sync_academic_sessions,
          skip_weekends: data.skip_weekends,
          blackout_dates: data.blackout_dates || [],
        });
      }
    } catch (error) {
      console.error('Error fetching sync configuration:', error);
      toast.error('Failed to load sync configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: SyncConfigFormValues) => {
    try {
      setIsSaving(true);

      // Validate sync window
      if (values.sync_window_start && values.sync_window_end) {
        if (values.sync_window_start >= values.sync_window_end) {
          toast.error('Sync window start must be before end time');
          return;
        }
      }

      // Ensure at least one data type is selected
      const hasDataType = values.sync_students || values.sync_teachers || 
                         values.sync_classes || values.sync_enrollments ||
                         values.sync_courses || values.sync_academic_sessions;
      
      if (!hasDataType) {
        toast.error('At least one data type must be selected for sync');
        return;
      }

      const { error } = await supabase
        .from('ic_sync_configuration' as any)
        .upsert({
          school_id: schoolId,
          ...values,
          updated_at: new Date().toISOString(),
        }) as any;

      if (error) throw error;

      // Calculate next sync time
      const { data: nextSync } = await supabase
        .rpc('calculate_next_sync_time' as any, {
          p_school_id: schoolId,
          p_from_time: new Date().toISOString()
        }) as any;

      if (nextSync) {
        await supabase
          .from('ic_sync_configuration' as any)
          .update({ next_scheduled_sync_at: nextSync })
          .eq('school_id', schoolId) as any;
      }

      toast.success('Sync configuration saved successfully');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error saving sync configuration:', error);
      toast.error('Failed to save sync configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Schedule Configuration</CardTitle>
        <CardDescription>
          Configure when and how often Infinite Campus data is synchronized
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Frequency Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sync Frequency</h3>
              
              <FormField
                control={form.control}
                name="interval_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom (Cron)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {intervalType !== 'custom' && (
                <FormField
                  control={form.control}
                  name="interval_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Interval Value ({intervalType === 'hourly' ? 'hours' : intervalType === 'daily' ? 'days' : 'weeks'})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={intervalType === 'hourly' ? 24 : intervalType === 'daily' ? 30 : 4}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Sync every {field.value} {intervalType === 'hourly' ? 'hour(s)' : intervalType === 'daily' ? 'day(s)' : 'week(s)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {intervalType === 'custom' && (
                <FormField
                  control={form.control}
                  name="custom_cron"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input placeholder="0 2 * * *" {...field} />
                      </FormControl>
                      <FormDescription>
                        Advanced: Use cron syntax for custom schedules
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Time Window */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sync Time Window</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sync_window_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Window Start</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_window_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Window End</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Data Types to Sync</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sync_students"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Students</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_teachers"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Teachers</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_classes"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Classes</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_enrollments"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enrollments</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_courses"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Courses</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_academic_sessions"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Academic Sessions</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Schedule Preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Schedule Preferences</h3>
              
              <FormField
                control={form.control}
                name="skip_weekends"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Skip Weekends</FormLabel>
                      <FormDescription>
                        Don't sync on Saturdays and Sundays
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blackout_dates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blackout Dates</FormLabel>
                    <FormControl>
                      <BlackoutDatePicker
                        selectedDates={field.value}
                        onDatesChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Select dates when syncs should not occur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}