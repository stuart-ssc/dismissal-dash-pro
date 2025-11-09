import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, Database, Info, CheckCircle2 } from 'lucide-react';
import { WizardState } from '../ICConnectionWizard';

interface StepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  schoolId: number;
  onComplete?: () => void;
}

const syncConfigSchema = z.object({
  intervalType: z.enum(['hourly', 'daily', 'weekly', 'custom']),
  intervalValue: z.number().min(1).max(24),
  syncWindowStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  syncWindowEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  timezone: z.string(),
  dataTypes: z.object({
    students: z.boolean(),
    teachers: z.boolean(),
    classes: z.boolean(),
    enrollments: z.boolean(),
  }).refine(data => data.students || data.teachers || data.classes || data.enrollments, {
    message: 'At least one data type must be selected',
  }),
  skipWeekends: z.boolean(),
});

type SyncConfigForm = z.infer<typeof syncConfigSchema>;

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

export function ICSyncConfigStep({ state, updateState, nextStep }: StepProps) {
  const form = useForm<SyncConfigForm>({
    resolver: zodResolver(syncConfigSchema),
    defaultValues: {
      intervalType: state.syncConfig.intervalType,
      intervalValue: state.syncConfig.intervalValue,
      syncWindowStart: state.syncConfig.syncWindowStart,
      syncWindowEnd: state.syncConfig.syncWindowEnd,
      timezone: state.syncConfig.timezone,
      dataTypes: state.syncConfig.dataTypes,
      skipWeekends: state.syncConfig.skipWeekends,
    },
  });

  const watchIntervalType = form.watch('intervalType');
  const watchSyncWindowStart = form.watch('syncWindowStart');
  const watchTimezone = form.watch('timezone');

  const getNextSyncPreview = (): string => {
    if (watchIntervalType === 'daily' && watchSyncWindowStart) {
      const [hours, minutes] = watchSyncWindowStart.split(':');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      return `Tomorrow at ${watchSyncWindowStart} ${watchTimezone.split('/')[1].replace('_', ' ')}`;
    }
    
    if (watchIntervalType === 'hourly') {
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      return `Every hour starting at ${nextHour.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    if (watchIntervalType === 'weekly') {
      return `Weekly on Sunday at ${watchSyncWindowStart}`;
    }
    
    return 'Based on your custom schedule';
  };

  const onSubmit = (data: SyncConfigForm) => {
    updateState({
      syncConfig: {
        ...state.syncConfig,
        intervalType: data.intervalType,
        intervalValue: data.intervalValue,
        syncWindowStart: data.syncWindowStart,
        syncWindowEnd: data.syncWindowEnd,
        timezone: data.timezone,
        dataTypes: {
          students: data.dataTypes.students,
          teachers: data.dataTypes.teachers,
          classes: data.dataTypes.classes,
          enrollments: data.dataTypes.enrollments,
        },
        skipWeekends: data.skipWeekends,
      },
    });
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Configure Sync Schedule</h2>
        <p className="text-muted-foreground">
          Choose when and what to sync from Infinite Campus. You can adjust these settings later.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          We've pre-selected recommended defaults. Most schools sync daily at 2:00 AM to ensure data is ready for the school day.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sync Frequency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Sync Frequency
              </CardTitle>
              <CardDescription>How often should we sync with Infinite Campus?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="intervalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily (Recommended)</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Daily syncing is recommended for most schools
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchIntervalType === 'daily' && (
                <>
                  <FormField
                    control={form.control}
                    name="syncWindowStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sync Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          When should the daily sync run? (2:00 AM is recommended)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          Your school's local timezone
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {watchIntervalType === 'hourly' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Hourly syncing will check for updates every hour during the time window you set below. 
                    This is useful for schools that need near real-time data updates.
                  </AlertDescription>
                </Alert>
              )}

              {watchIntervalType === 'custom' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Custom schedules can be configured after setup is complete. For now, we'll use a daily schedule 
                    and you can adjust it to a custom cron expression later.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Data Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-primary" />
                Data to Sync
              </CardTitle>
              <CardDescription>Select which data types to sync from Infinite Campus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="dataTypes.students"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        Students
                      </FormLabel>
                      <FormDescription>
                        Sync student roster, grade levels, and basic information
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataTypes.teachers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        Teachers
                      </FormLabel>
                      <FormDescription>
                        Sync teacher information and contact details
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataTypes.classes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        Classes
                      </FormLabel>
                      <FormDescription>
                        Sync class schedules and room assignments
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataTypes.enrollments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        Enrollments
                      </FormLabel>
                      <FormDescription>
                        Sync student-to-class enrollment relationships
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.formState.errors.dataTypes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.dataTypes.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Additional Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="skipWeekends"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Skip Weekend Syncs
                      </FormLabel>
                      <FormDescription>
                        Don't sync on Saturdays and Sundays
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Alert className="bg-muted">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> You can configure blackout dates for holidays and school breaks 
                  after completing the initial setup.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Next Sync Preview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Next Sync Preview</p>
                  <p className="text-sm text-muted-foreground">
                    {getNextSyncPreview()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end pt-4">
            <Button type="submit" size="lg">
              Continue to Review
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
