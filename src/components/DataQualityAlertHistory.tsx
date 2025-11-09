import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, Clock } from "lucide-react";
import { format } from "date-fns";

interface Alert {
  id: string;
  created_at: string;
  alert_type: string;
  severity: string;
  overall_completeness_score: number;
  data_quality_grade: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledgment_notes: string | null;
  issues_detected: any;
}

export function DataQualityAlertHistory({ schoolId }: { schoolId: number }) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, [schoolId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('ic_data_quality_alerts')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load alert history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('ic_data_quality_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
          acknowledgment_notes: acknowledgeNotes,
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alert acknowledged",
      });

      setAcknowledgingId(null);
      setAcknowledgeNotes("");
      fetchAlerts();
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const severityColors = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert History
        </CardTitle>
        <CardDescription>
          Recent data quality alerts and acknowledgments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No alerts yet. You'll be notified when data quality drops below your thresholds.
          </p>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={severityColors[alert.severity as keyof typeof severityColors]}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-2xl font-bold">{alert.data_quality_grade}</span>
                      <span className="text-muted-foreground">
                        {alert.overall_completeness_score.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(alert.created_at), 'PPpp')}
                    </p>
                  </div>

                  {alert.acknowledged ? (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      Acknowledged
                    </Badge>
                  ) : (
                    <Dialog open={acknowledgingId === alert.id} onOpenChange={(open) => {
                      if (!open) {
                        setAcknowledgingId(null);
                        setAcknowledgeNotes("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAcknowledgingId(alert.id)}
                        >
                          <Clock className="mr-2 h-3 w-3" />
                          Acknowledge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Acknowledge Alert</DialogTitle>
                          <DialogDescription>
                            Add notes about actions taken to address this alert
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Optional: What actions did you take?"
                            value={acknowledgeNotes}
                            onChange={(e) => setAcknowledgeNotes(e.target.value)}
                          />
                          <Button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="w-full"
                          >
                            Acknowledge Alert
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {alert.issues_detected && alert.issues_detected.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Issues Detected:</p>
                    <ul className="text-sm space-y-1">
                      {alert.issues_detected.map((issue: any, idx: number) => (
                        <li key={idx} className="text-muted-foreground">
                          • {issue.category}: {issue.metric} ({issue.actual_value.toFixed(1)}% vs {issue.threshold}% target)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {alert.acknowledgment_notes && (
                  <div className="bg-muted rounded p-3">
                    <p className="text-sm font-medium mb-1">Action Notes:</p>
                    <p className="text-sm text-muted-foreground">{alert.acknowledgment_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
