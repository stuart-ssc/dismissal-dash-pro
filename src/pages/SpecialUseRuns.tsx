import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Play, Edit, Filter, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { format } from "date-fns";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
import { BulkSessionAssigner } from "@/components/BulkSessionAssigner";
import { toast } from "sonner";

const formatTimeString = (timeString: string | null): string => {
  if (!timeString) return "-";
  
  // Parse the time string (format: "HH:mm:ss" or "HH:mm")
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

type SpecialUseRun = {
  id: string;
  run_name: string;
  run_date: string;
  status: string;
  scheduled_departure_time: string | null;
  scheduled_return_time: string | null;
  academic_session_id?: string | null;
  group: {
    name: string;
    group_type: string;
  };
  buses: { bus_number: string }[];
  session?: { session_name: string } | null;
};

export default function SpecialUseRuns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [academicSessions, setAcademicSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<number | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      if (profileData?.school_id) {
        setSchoolId(profileData.school_id);
        
        const { data: sessions } = await supabase
          .from("academic_sessions")
          .select("*")
          .eq("school_id", profileData.school_id)
          .order("start_date", { ascending: false });

        if (sessions) {
          setAcademicSessions(sessions);
          const activeSession = sessions.find((s) => s.is_active);
          setSelectedSessionId(activeSession?.id || sessions[0]?.id || null);
        }
      }
    };

    if (user?.id) {
      fetchSessions();
    }
  }, [user?.id]);

  const { data: runs = [], isLoading, refetch } = useQuery<SpecialUseRun[]>({
    queryKey: ["special-use-runs", user?.id, selectedSessionId, showUnassignedOnly],
    queryFn: async () => {
      if (!selectedSessionId && !showUnassignedOnly) return [];

      let query = supabase
        .from("special_use_runs")
        .select(`
          id,
          run_name,
          run_date,
          status,
          scheduled_departure_time,
          scheduled_return_time,
          academic_session_id,
          session:academic_sessions(session_name),
          group:special_use_groups(name, group_type),
          buses:special_use_run_buses(
            bus:buses(bus_number)
          )
        `);

      if (showUnassignedOnly) {
        query = query.is("academic_session_id", null);
        if (schoolId) {
          query = query.eq("school_id", schoolId);
        }
      } else {
        query = query.eq("academic_session_id", selectedSessionId);
      }

      const { data, error } = await query.order("run_date", { ascending: false });

      if (error) throw error;

      return data.map(run => ({
        ...run,
        group: run.group,
        buses: run.buses.map((b: any) => b.bus)
      })) as SpecialUseRun[];
    },
    enabled: !!user && (!!selectedSessionId || showUnassignedOnly),
  });

  const filteredRuns = runs.filter((run) =>
    run.run_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    run.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRunIds(new Set(filteredRuns.map(r => r.id)));
    } else {
      setSelectedRunIds(new Set());
    }
  };

  const handleSelectRun = (runId: string, checked: boolean) => {
    const newSelected = new Set(selectedRunIds);
    if (checked) {
      newSelected.add(runId);
    } else {
      newSelected.delete(runId);
    }
    setSelectedRunIds(newSelected);
  };

  const handleSessionChange = async (runId: string, sessionId: string) => {
    try {
      const { error } = await supabase
        .from("special_use_runs")
        .update({ academic_session_id: sessionId })
        .eq("id", runId);

      if (error) throw error;

      toast.success("Session updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update session");
    }
  };

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

  const handleLaunch = async (runId: string) => {
    navigate(`/modes/special-use-run/${runId}`);
  };

  return (
    <>
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Label htmlFor="session-select" className="text-sm font-medium whitespace-nowrap">
              Academic Year:
            </Label>
            <Select
              value={selectedSessionId || undefined}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger id="session-select" className="w-[240px]">
                <SelectValue placeholder="Select session..." />
              </SelectTrigger>
              <SelectContent>
                {academicSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.session_name}
                    {session.is_active && " (Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSessionId && (
              <Badge variant="outline" className="ml-2">
                Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
              </Badge>
            )}
          </div>
        </div>

        {selectedRunIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedRunIds.size} {selectedRunIds.size === 1 ? "run" : "runs"} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRunIds(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setBulkAssignDialogOpen(true)}
            >
              Assign Session
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            variant={showUnassignedOnly ? "default" : "outline"}
          >
            {showUnassignedOnly ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            {showUnassignedOnly ? "Show All" : "Unassigned Only"}
          </Button>
        </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading runs...</div>
      ) : filteredRuns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No runs found matching your search" : "No runs scheduled yet"}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRunIds.size === filteredRuns.length && filteredRuns.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Run Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Academic Session</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Return</TableHead>
                <TableHead>Buses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRunIds.has(run.id)}
                      onCheckedChange={(checked) => handleSelectRun(run.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/dashboard/special-use-runs/${run.id}`)}
                      className="font-medium text-left hover:underline hover:text-primary transition-colors"
                    >
                      {run.run_name}
                    </button>
                  </TableCell>
                  <TableCell>{run.group.name}</TableCell>
                  <TableCell>
                    {run.academic_session_id ? (
                      <Select
                        value={run.academic_session_id}
                        onValueChange={(value) => handleSessionChange(run.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {academicSessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.session_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="destructive">Not Assigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(run.run_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {formatTimeString(run.scheduled_departure_time)}
                  </TableCell>
                  <TableCell>
                    {formatTimeString(run.scheduled_return_time)}
                  </TableCell>
                  <TableCell>
                    {run.buses.map(b => b.bus_number).join(", ")}
                  </TableCell>
                  <TableCell>{getStatusBadge(run.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {run.status === "scheduled" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRun(run);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleLaunch(run.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Launch
                          </Button>
                        </>
                      )}
                      {(run.status === "outbound_active" || run.status === "at_destination" || run.status === "return_active") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLaunch(run.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SpecialUseRunDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        run={selectedRun}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          setSelectedRun(null);
        }}
      />

      <BulkSessionAssigner
        open={bulkAssignDialogOpen}
        onOpenChange={setBulkAssignDialogOpen}
        selectedIds={Array.from(selectedRunIds)}
        entityType="run"
        sessions={academicSessions}
        onSuccess={() => {
          setSelectedRunIds(new Set());
          refetch();
        }}
      />
      </main>
    </>
  );
}
