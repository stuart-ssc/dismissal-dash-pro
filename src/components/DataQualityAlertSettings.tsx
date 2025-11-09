import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Save } from "lucide-react";

interface AlertConfig {
  overall_threshold: number;
  student_contact_threshold: number;
  student_parent_threshold: number;
  teacher_email_threshold: number;
  class_coverage_threshold: number;
  alert_enabled: boolean;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  alert_cooldown_hours: number;
}

export function DataQualityAlertSettings({ schoolId }: { schoolId: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    overall_threshold: 80,
    student_contact_threshold: 90,
    student_parent_threshold: 90,
    teacher_email_threshold: 95,
    class_coverage_threshold: 95,
    alert_enabled: true,
    weekly_summary_enabled: true,
    weekly_summary_day: 1,
    alert_cooldown_hours: 24,
  });

  useEffect(() => {
    fetchConfig();
  }, [schoolId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ic_data_quality_alert_config')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error: any) {
      console.error('Error fetching alert config:', error);
      toast({
        title: "Error",
        description: "Failed to load alert settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ic_data_quality_alert_config')
        .upsert({
          school_id: schoolId,
          ...config,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving alert config:', error);
      toast({
        title: "Error",
        description: "Failed to save alert settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Alert Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const weekDays = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Data Quality Alert Settings
        </CardTitle>
        <CardDescription>
          Configure automatic notifications when data quality falls below thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Alerts */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications when data quality drops
            </p>
          </div>
          <Switch
            checked={config.alert_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, alert_enabled: checked })}
          />
        </div>

        {/* Threshold Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Alert Thresholds (%)</h4>
          
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="overall">Overall Data Quality</Label>
              <Input
                id="overall"
                type="number"
                min="0"
                max="100"
                value={config.overall_threshold}
                onChange={(e) => setConfig({ ...config, overall_threshold: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-contact">Student Contact Info Completeness</Label>
              <Input
                id="student-contact"
                type="number"
                min="0"
                max="100"
                value={config.student_contact_threshold}
                onChange={(e) => setConfig({ ...config, student_contact_threshold: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-parent">Student Parent Name Completeness</Label>
              <Input
                id="student-parent"
                type="number"
                min="0"
                max="100"
                value={config.student_parent_threshold}
                onChange={(e) => setConfig({ ...config, student_parent_threshold: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher-email">Teacher Email Completeness</Label>
              <Input
                id="teacher-email"
                type="number"
                min="0"
                max="100"
                value={config.teacher_email_threshold}
                onChange={(e) => setConfig({ ...config, teacher_email_threshold: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="class-coverage">Class Teacher Coverage</Label>
              <Input
                id="class-coverage"
                type="number"
                min="0"
                max="100"
                value={config.class_coverage_threshold}
                onChange={(e) => setConfig({ ...config, class_coverage_threshold: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Cooldown Period */}
        <div className="grid gap-2">
          <Label htmlFor="cooldown">Alert Cooldown (hours)</Label>
          <Input
            id="cooldown"
            type="number"
            min="1"
            max="168"
            value={config.alert_cooldown_hours}
            onChange={(e) => setConfig({ ...config, alert_cooldown_hours: parseInt(e.target.value) })}
          />
          <p className="text-sm text-muted-foreground">
            Minimum time between alerts to prevent spam
          </p>
        </div>

        {/* Weekly Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly data quality report
              </p>
            </div>
            <Switch
              checked={config.weekly_summary_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, weekly_summary_enabled: checked })}
            />
          </div>

          {config.weekly_summary_enabled && (
            <div className="grid gap-2">
              <Label htmlFor="summary-day">Send Summary On</Label>
              <Select
                value={config.weekly_summary_day.toString()}
                onValueChange={(value) => setConfig({ ...config, weekly_summary_day: parseInt(value) })}
              >
                <SelectTrigger id="summary-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button onClick={saveConfig} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Alert Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
