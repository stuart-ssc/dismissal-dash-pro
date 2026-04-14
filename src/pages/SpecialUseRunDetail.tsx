import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Bus, Users, Shield, Calendar, Clock, MapPin, FileText, Edit, XCircle, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
import { CancelRunDialog } from "@/components/CancelRunDialog";

const formatTimeString = (timeString: string | null): string => {
  if (!timeString) return "Not set";
  
  // Parse the time string (format: "HH:mm:ss" or "HH:mm")
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function SpecialUseRunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: run, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["special-use-run-detail", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_use_runs")
        .select(`
          *,
          group:special_use_groups(
            id,
            name,
            group_type,
            description,
            academic_session_id
          ),
          academic_session:academic_sessions(
            id,
            session_name,
            session_code,
            start_date,
            end_date,
            is_active
          ),
          buses:special_use_run_buses(
            id,
            bus:buses(
              id,
              bus_number,
              capacity
            )
          ),
          managers:special_use_run_managers(
            manager:profiles(
              id,
              first_name,
              last_name,
              email
            )
          ),
          events:special_use_student_events(
            id,
            event_type,
            event_time,
            notes,
            parent_name,
            student:students(
              first_name,
              last_name
            ),
            bus:buses(
              bus_number
            ),
            recorded_by_profile:profiles(
              first_name,
              last_name
            )
          ),
          cancelled_by_profile:profiles!cancelled_by(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("id", runId)
        .maybeSingle();

      // Log error for debugging
      if (error) {
        console.error("Error loading run:", error);
        throw error;
      }

      // If no data and no error, it's likely RLS blocking
      if (!data) {
        console.warn("No run data returned - likely RLS policy blocking access");
        return null;
      }

      // Fetch students from the group
      const { data: studentsData } = await supabase
        .from("special_use_group_students")
        .select(`
          student:students(
            id,
            first_name,
            last_name,
            student_id
          )
        `)
        .eq("group_id", data.group_id);

      return {
        ...data,
        buses: data.buses.map((b: any) => b.bus),
        students: studentsData?.map((s: any) => s.student).filter(Boolean) || [],
        managers: data.managers.map((m: any) => m.manager).filter(Boolean),
        events: data.events || []
      };
    },
    enabled: !!runId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      scheduled: { label: "Scheduled", variant: "outline" },
      outbound_active: { label: "Outbound", variant: "default" },
      at_destination: { label: "At Destination", variant: "secondary" },
      return_active: { label: "Returning", variant: "default" },
      completed: { label: "Completed", variant: "secondary" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      outbound_loaded: { label: "Loaded (Outbound)", variant: "default" },
      outbound_arrived: { label: "Arrived at Destination", variant: "secondary" },
      return_loaded: { label: "Loaded (Return)", variant: "default" },
      return_dropped: { label: "Dropped Off", variant: "secondary" },
      parent_pickup: { label: "Parent Pickup", variant: "outline" },
    };
    const config = variants[eventType] || { label: eventType.replace(/_/g, " "), variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <>
        <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/dismissals/special-runs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    );
  }

  if (!run && !isLoading) {
    const isPermissionIssue = !queryError;
    
    return (
      <>
        <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/dismissals/special-runs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{isPermissionIssue ? "Access Denied" : "Run Not Found"}</h1>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Card>
            <CardContent className="pt-6">
              {isPermissionIssue ? (
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    You don't have permission to view this run.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You must be assigned as a manager for this run or be a school administrator.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  The requested run could not be found.
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/dismissals/special-runs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{run.run_name}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(run.run_date), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div>{getStatusBadge(run.status)}</div>
          {run.status === "scheduled" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Run
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Cancellation Info Card */}
        {run.status === "cancelled" && run.cancellation_reason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Run Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p className="mt-1">{run.cancellation_reason}</p>
                </div>
                {run.cancelled_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cancelled At</p>
                    <p className="mt-1">{format(new Date(run.cancelled_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {run.cancelled_by_profile && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cancelled By</p>
                    <p className="mt-1">
                      {run.cancelled_by_profile.first_name} {run.cancelled_by_profile.last_name}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run Information */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {run.academic_session && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{run.academic_session.session_name}</p>
                <p className="text-sm text-muted-foreground">{run.academic_session.session_code}</p>
                <div className="flex items-center gap-2 mt-2">
                  {run.academic_session.is_active && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(run.academic_session.start_date), "MMM yyyy")} - {format(new Date(run.academic_session.end_date), "MMM yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{run.group.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{run.group.group_type.replace(/_/g, " ")}</p>
              {run.group.description && (
                <p className="text-sm text-muted-foreground mt-2">{run.group.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Departure</p>
                <p className="font-medium">{formatTimeString(run.scheduled_departure_time)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return</p>
                <p className="font-medium">{formatTimeString(run.scheduled_return_time)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {run.outbound_started_at && (
                <div>
                  <p className="text-muted-foreground">Outbound Started</p>
                  <p>{format(new Date(run.outbound_started_at), "h:mm a")}</p>
                </div>
              )}
              {run.outbound_completed_at && (
                <div>
                  <p className="text-muted-foreground">Arrived at Destination</p>
                  <p>{format(new Date(run.outbound_completed_at), "h:mm a")}</p>
                </div>
              )}
              {run.return_started_at && (
                <div>
                  <p className="text-muted-foreground">Return Started</p>
                  <p>{format(new Date(run.return_started_at), "h:mm a")}</p>
                </div>
              )}
              {run.return_completed_at && (
                <div>
                  <p className="text-muted-foreground">Return Completed</p>
                  <p>{format(new Date(run.return_completed_at), "h:mm a")}</p>
                </div>
              )}
              {!run.outbound_started_at && (
                <p className="text-muted-foreground">No activity yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {run.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{run.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Assigned Buses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Assigned Buses ({run.buses.length})
            </CardTitle>
            <CardDescription>Buses assigned to this run</CardDescription>
          </CardHeader>
          <CardContent>
            {run.buses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No buses assigned</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {run.buses.map((bus: any) => (
                  <div key={bus.id} className="border rounded-lg p-4">
                    <p className="font-semibold">Bus {bus.bus_number}</p>
                    <p className="text-sm text-muted-foreground">Capacity: {bus.capacity}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Managers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Managers ({run.managers.length})
            </CardTitle>
            <CardDescription>Staff managing this run</CardDescription>
          </CardHeader>
          <CardContent>
            {run.managers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No managers assigned</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {run.managers.map((manager: any) => (
                  <div key={manager.id} className="border rounded-lg p-4">
                    <p className="font-semibold">
                      {manager.first_name} {manager.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{manager.email}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Roster ({run.students.length})
            </CardTitle>
            <CardDescription>Students in this group</CardDescription>
          </CardHeader>
          <CardContent>
            {run.students.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No students in this group</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.students.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.student_id}</TableCell>
                      <TableCell>
                        {student.first_name} {student.last_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Event History */}
        <Card>
          <CardHeader>
            <CardTitle>Event History ({run.events.length})</CardTitle>
            <CardDescription>All events logged for this run</CardDescription>
          </CardHeader>
          <CardContent>
            {run.events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No events logged yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.events
                    .sort((a: any, b: any) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
                    .map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(event.event_time), "h:mm a")}
                        </TableCell>
                        <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                        <TableCell>
                          {event.student?.first_name} {event.student?.last_name}
                        </TableCell>
                        <TableCell>{event.bus?.bus_number || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.parent_name && `Parent: ${event.parent_name}`}
                          {event.notes && ` - ${event.notes}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.recorded_by_profile
                            ? `${event.recorded_by_profile.first_name} ${event.recorded_by_profile.last_name}`
                            : "System"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <SpecialUseRunDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        run={run}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Cancel Dialog */}
      <CancelRunDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        runId={run.id}
        runName={run.run_name}
        runDate={format(new Date(run.run_date), "EEEE, MMMM d, yyyy")}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
}
