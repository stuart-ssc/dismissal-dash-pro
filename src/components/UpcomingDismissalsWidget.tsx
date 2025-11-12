import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { format, endOfWeek, isToday, isTomorrow, parseISO } from "date-fns";

interface UpcomingDismissalsWidgetProps {
  schoolId: number | null;
}

interface DismissalRunItem {
  id: string;
  date: string;
  time: string | null;
  type: "regular" | "special";
  name: string;
  status: string;
  groupType?: string;
}

const getDateLabel = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled":
      return "default";
    case "in_progress":
      return "warning";
    case "active":
      return "warning";
    default:
      return "secondary";
  }
};

const getTypeLabel = (item: DismissalRunItem): string => {
  if (item.type === "regular") return "Regular Dismissal";
  return item.groupType || "Special Run";
};

export function UpcomingDismissalsWidget({ schoolId }: UpcomingDismissalsWidgetProps) {
  const { data: upcomingItems, isLoading, error } = useQuery({
    queryKey: ["upcoming-dismissals", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(new Date()), "yyyy-MM-dd");

      // Fetch regular dismissal runs
      const { data: dismissalRuns, error: dismissalError } = await supabase
        .from("dismissal_runs")
        .select("id, date, scheduled_start_time, status")
        .eq("school_id", Number(schoolId))
        .gte("date", today)
        .lte("date", weekEnd)
        .neq("status", "completed")
        .order("date", { ascending: true })
        .limit(10);

      if (dismissalError) throw dismissalError;

      // Fetch special use runs
      const { data: specialRuns, error: specialError } = await supabase
        .from("special_use_runs")
        .select(`
          id,
          run_name,
          run_date,
          status,
          scheduled_departure_time,
          special_use_groups (
            name,
            group_type
          )
        `)
        .eq("school_id", Number(schoolId))
        .gte("run_date", today)
        .lte("run_date", weekEnd)
        .in("status", ["scheduled", "in_progress"])
        .order("run_date", { ascending: true })
        .limit(10);

      if (specialError) throw specialError;

      // Combine and format items
      const items: DismissalRunItem[] = [];

      dismissalRuns?.forEach((run) => {
        items.push({
          id: run.id,
          date: run.date,
          time: run.scheduled_start_time,
          type: "regular",
          name: "Regular Dismissal",
          status: run.status,
        });
      });

      specialRuns?.forEach((run) => {
        items.push({
          id: run.id,
          date: run.run_date,
          time: run.scheduled_departure_time,
          type: "special",
          name: run.run_name,
          status: run.status,
          groupType: Array.isArray(run.special_use_groups) 
            ? run.special_use_groups[0]?.group_type 
            : (run.special_use_groups as any)?.group_type,
        });
      });

      // Sort by date and time, limit to 7
      items.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (!a.time || !b.time) return 0;
        return a.time.localeCompare(b.time);
      });

      return items.slice(0, 7);
    },
    enabled: !!schoolId,
  });

  if (isLoading) {
    return (
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Upcoming Dismissals</CardTitle>
          <CardDescription>Scheduled for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Upcoming Dismissals</CardTitle>
          <CardDescription>Scheduled for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load upcoming dismissals. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle>Upcoming Dismissals</CardTitle>
        <CardDescription>Scheduled for this week</CardDescription>
      </CardHeader>
      <CardContent>
        {!upcomingItems || upcomingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming dismissals scheduled this week
          </p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {getDateLabel(item.date)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.type === "special" && item.groupType && (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {item.groupType}
                        </Badge>
                      </div>
                    )}
                    <div>
                      <Badge variant={getStatusColor(item.status)} className="text-xs capitalize">
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
