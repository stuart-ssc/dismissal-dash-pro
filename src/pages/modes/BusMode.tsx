
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import ExitModeButton from "@/components/ExitModeButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Bus = { id: string; bus_number: string; driver_first_name: string; driver_last_name: string };
type BusEvent = {
  id: string;
  bus_id: string;
  check_in_time: string | null;
  order_index: number | null;
  departed_at: string | null;
};

export default function BusMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { run, schoolId, isLoading } = useTodayDismissalRun();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [events, setEvents] = useState<Record<string, BusEvent>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [busStudents, setBusStudents] = useState<{ id: string; first_name: string; last_name: string; grade_level: string }[]>([]);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completingDismissal, setCompletingDismissal] = useState(false);
  const runId = run?.id;
  const isCompleted = !!run?.ended_at;

  const fetchData = useMemo(
    () => async () => {
      if (!schoolId || !runId) return;
      setLoadingData(true);
      const { data: busList, error: busErr } = await supabase
        .from("buses")
        .select("id,bus_number,driver_first_name,driver_last_name")
        .eq("school_id", schoolId)
        .order("bus_number", { ascending: true });

      if (busErr) {
        console.error(busErr);
        setLoadingData(false);
        return;
      }
      setBuses((busList || []) as Bus[]);

      const { data: evList, error: evErr } = await supabase
        .from("bus_run_events")
        .select("id,bus_id,check_in_time,order_index,departed_at")
        .eq("dismissal_run_id", runId);

      if (evErr) {
        console.error(evErr);
        setLoadingData(false);
        return;
      }

      const map: Record<string, BusEvent> = {};
      (evList || []).forEach((e: any) => {
        map[e.bus_id] = e as BusEvent;
      });
      setEvents(map);
      setLoadingData(false);
    },
    [schoolId, runId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime updates for bus events
  useEffect(() => {
    if (!runId) return;
    const channel = supabase
      .channel("bus-run-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bus_run_events", filter: `dismissal_run_id=eq.${runId}` },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, fetchData]);

  const nextOrderIndex = () => {
    const current = Object.values(events)
      .map((e) => e.order_index ?? 0)
      .filter((x) => x !== null);
    const max = current.length ? Math.max(...current) : 0;
    return max + 1;
  };

  const checkInBus = async (bus: Bus) => {
    if (!runId || !schoolId || !user) return;
    const existing = events[bus.id];
    const payload = {
      school_id: schoolId,
      dismissal_run_id: runId,
      bus_id: bus.id,
      check_in_time: existing?.check_in_time ? existing.check_in_time : new Date().toISOString(),
      checked_in_by: user.id,
      order_index: existing?.order_index ?? nextOrderIndex(),
    };
    const { error } = await supabase
      .from("bus_run_events")
      .upsert(payload, { onConflict: "dismissal_run_id,bus_id" });

    if (error) console.error(error);
  };

  const markDeparted = async (bus: Bus) => {
    if (!runId || !user) return;
    const existing = events[bus.id];
    if (!existing) return; // must be checked in first
    const { error } = await supabase
      .from("bus_run_events")
      .update({ departed_at: new Date().toISOString(), departed_by: user.id })
      .eq("id", existing.id);
    if (error) console.error(error);
  };

  const openStudents = async (bus: Bus) => {
    setSelectedBus(bus);
    // Fetch students assigned to this bus
    const { data: assignments } = await supabase
      .from("student_bus_assignments")
      .select("student_id")
      .eq("bus_id", bus.id);

    const ids = (assignments || []).map((a) => a.student_id);
    if (ids.length === 0) {
      setBusStudents([]);
      return;
    }

    const { data: students } = await supabase
      .from("students")
      .select("id,first_name,last_name,grade_level")
      .in("id", ids)
      .order("last_name", { ascending: true });

    setBusStudents((students || []) as any);
  };

  const sortedBuses = useMemo(() => {
    const withOrder = [...buses].sort((a, b) => {
      const eA = events[a.id];
      const eB = events[b.id];
      const oA = eA?.order_index ?? 9999;
      const oB = eB?.order_index ?? 9999;
      return oA - oB || a.bus_number.localeCompare(b.bus_number);
    });
    return withOrder;
  }, [buses, events]);

  // Complete dismissal function
  const completeDismissal = async () => {
    if (!runId || !user || completingDismissal || isCompleted) return;
    
    setCompletingDismissal(true);
    try {
      const { error } = await supabase
        .from('dismissal_runs')
        .update({ 
          ended_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', runId);

      if (error) throw error;

      toast({
        title: "Bus Dismissal Completed",
        description: "All bus dismissal activities have been marked as complete.",
      });
    } catch (error) {
      console.error('Error completing dismissal:', error);
      toast({
        title: "Error",
        description: "Failed to complete bus dismissal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingDismissal(false);
      setShowCompletionDialog(false);
    }
  };

  // Auto-completion detection
  useEffect(() => {
    if (!runId || isCompleted || showCompletionDialog) return;

    const checkedInBuses = Object.values(events).filter(event => event.check_in_time);
    if (checkedInBuses.length === 0) return; // No buses checked in yet

    const allCheckedInBusesHaveDeparted = checkedInBuses.every(event => event.departed_at);
    
    if (allCheckedInBusesHaveDeparted && checkedInBuses.length > 0) {
      setShowCompletionDialog(true);
    }
  }, [events, runId, isCompleted, showCompletionDialog]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Bus Dismissal {isCompleted && <span className="text-green-600">- Completed</span>}
          </h1>
          <p className="text-muted-foreground mt-2">Check in buses, view riders, and mark departures.</p>
        </header>

        {isLoading || loadingData ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Loading...
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Today&apos;s Buses</CardTitle>
                {!isCompleted && !isLoading && (
                  <Button
                    onClick={() => setShowCompletionDialog(true)}
                    variant="destructive"
                    size="lg"
                    disabled={completingDismissal}
                    className="shadow-lg font-semibold px-6 py-3"
                  >
                    {completingDismissal ? "Completing..." : "Mark Dismissal as Completed"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Bus</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBuses.map((bus) => {
                      const ev = events[bus.id];
                      const status = ev?.departed_at
                        ? "Departed"
                        : ev?.check_in_time
                        ? "Present"
                        : "Not arrived";
                      return (
                        <TableRow key={bus.id}>
                          <TableCell className="font-mono">{ev?.order_index ?? "-"}</TableCell>
                          <TableCell className="font-semibold">{bus.bus_number}</TableCell>
                          <TableCell>
                            {bus.driver_first_name} {bus.driver_last_name}
                          </TableCell>
                          <TableCell>{status}</TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" onClick={() => openStudents(bus)}>
                                  View Students
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Riders for Bus {selectedBus?.bus_number}</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-y-auto">
                                  {busStudents.length === 0 ? (
                                    <p className="text-muted-foreground">No students assigned.</p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {busStudents.map((s) => (
                                        <li key={s.id} className="flex justify-between">
                                          <span>
                                            {s.last_name}, {s.first_name}
                                          </span>
                                          <span className="text-muted-foreground">{s.grade_level}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            {!ev?.check_in_time && !isCompleted && (
                              <Button onClick={() => checkInBus(bus)} disabled={isCompleted}>
                                Check In
                              </Button>
                            )}
                            {ev?.check_in_time && !ev?.departed_at && !isCompleted && (
                              <Button variant="secondary" onClick={() => markDeparted(bus)} disabled={isCompleted}>
                                Mark Departed
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ExitModeButton label="Exit Bus Mode" />

      {/* Auto-completion confirmation dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>All Buses Have Departed</AlertDialogTitle>
            <AlertDialogDescription>
              All checked-in buses have departed. Would you like to mark the Bus Dismissal as complete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Yet</AlertDialogCancel>
            <AlertDialogAction 
              onClick={completeDismissal}
              disabled={completingDismissal}
            >
              {completingDismissal ? "Completing..." : "Mark Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
