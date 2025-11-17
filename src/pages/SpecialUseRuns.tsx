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
import { Plus, Search, Play, Edit, Download, Settings, MoreHorizontal, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { format } from "date-fns";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
import { toast } from "sonner";
import { convertToCSV, downloadCSV, formatTimeForCSV } from "@/lib/csvExport";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>("all");
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      if (profileData?.school_id) {
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
    queryKey: ["special-use-runs", user?.id, selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];

      const { data, error } = await supabase
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
        `)
        .eq("academic_session_id", selectedSessionId)
        .order("run_date", { ascending: false });

      if (error) throw error;

      return data.map(run => ({
        ...run,
        group: run.group,
        buses: run.buses.map((b: any) => b.bus)
      })) as SpecialUseRun[];
    },
    enabled: !!user && !!selectedSessionId,
  });

  const filteredRuns = runs.filter((run) => {
    const matchesSearch = run.run_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    const matchesGroupType = groupTypeFilter === "all" || run.group.group_type === groupTypeFilter;
    return matchesSearch && matchesStatus && matchesGroupType;
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

  const handleLaunch = async (runId: string) => {
    navigate(`/modes/special-use-run/${runId}`);
  };

  const handleExportCSV = () => {
    if (filteredRuns.length === 0) {
      toast.error("No runs to export");
      return;
    }

    const exportData = filteredRuns.map(run => ({
      'Run Name': run.run_name,
      'Group': run.group.name,
      'Academic Session': run.session?.session_name || 'Not Assigned',
      'Date': format(new Date(run.run_date), 'MMM d, yyyy'),
      'Departure Time': formatTimeForCSV(run.scheduled_departure_time),
      'Return Time': formatTimeForCSV(run.scheduled_return_time),
      'Buses': run.buses.map(b => b.bus_number).join('; '),
      'Status': run.status === 'scheduled' ? 'Scheduled' :
                run.status === 'outbound_active' ? 'Outbound' :
                run.status === 'at_destination' ? 'At Destination' :
                run.status === 'return_active' ? 'Returning' :
                run.status === 'completed' ? 'Completed' :
                run.status === 'cancelled' ? 'Cancelled' : run.status,
    }));

    const csv = convertToCSV(
      exportData,
      ['Run Name', 'Group', 'Academic Session', 'Date', 'Departure Time', 'Return Time', 'Buses', 'Status']
    );

    const filename = `special-use-runs-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
    toast.success(`Exported ${filteredRuns.length} runs to CSV`);
  };

  return (
    <>
      <main className="flex-1 p-6 space-y-6">
        {/* Search/Settings/New Run row - OUTSIDE CARD */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="outbound_active">Outbound</SelectItem>
              <SelectItem value="at_destination">At Destination</SelectItem>
              <SelectItem value="return_active">Returning</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupTypeFilter} onValueChange={setGroupTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="field_trip">Field Trip</SelectItem>
              <SelectItem value="athletics">Athletics</SelectItem>
              <SelectItem value="club">Club</SelectItem>
              <SelectItem value="afterschool">After School</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Settings button - Desktop only (with text) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden sm:flex">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
              <DropdownMenuLabel>Administrative Functions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Label htmlFor="settings-session-select" className="text-sm font-medium">
                  Academic Year
                </Label>
                <Select
                  value={selectedSessionId || undefined}
                  onValueChange={setSelectedSessionId}
                >
                  <SelectTrigger id="settings-session-select" className="w-full mt-2">
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
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleExportCSV}
                disabled={filteredRuns.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Desktop: New Run button shown separately */}
          <Button 
            onClick={() => {
              setSelectedRun(null);
              setDialogOpen(true);
            }}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Run
          </Button>
          
          {/* Mobile only: New Run + Settings icon in same row */}
          <div className="flex sm:hidden gap-2">
            <Button 
              onClick={() => {
                setSelectedRun(null);
                setDialogOpen(true);
              }}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Run
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px]">
                <DropdownMenuLabel>Administrative Functions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Label htmlFor="settings-session-select-mobile" className="text-sm font-medium">
                    Academic Year
                  </Label>
                  <Select
                    value={selectedSessionId || undefined}
                    onValueChange={setSelectedSessionId}
                  >
                    <SelectTrigger id="settings-session-select-mobile" className="w-full mt-2">
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
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleExportCSV}
                  disabled={filteredRuns.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Data Card */}
        <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <CardTitle>Special Use Runs</CardTitle>
          <CardDescription className="mt-2">
            Schedule and manage special trips, field trips, athletic events, and after-school activities
          </CardDescription>
          {selectedSessionId && academicSessions.length > 0 && (
            <Badge variant="secondary" className="font-normal mt-3">
              Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
            </Badge>
          )}
        </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading runs...
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No runs found matching your search" : "No runs scheduled yet"}
              </div>
            ) : (
              <>
                {/* MOBILE CARD LAYOUT */}
                <div className="md:hidden space-y-3">
                  {filteredRuns.map((run) => (
                    <Card key={run.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base">{run.run_name}</CardTitle>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {getStatusBadge(run.status)}
                              <Badge variant="outline" className="text-xs">
                                {run.group.group_type === 'field_trip' ? 'Field Trip' :
                                 run.group.group_type === 'athletics' ? 'Athletics' :
                                 run.group.group_type === 'club' ? 'Club' :
                                 run.group.group_type === 'afterschool' ? 'After School' :
                                 'Other'}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {run.status === "scheduled" && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedRun(run);
                                    setDialogOpen(true);
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleLaunch(run.id)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Launch
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(run.status === "outbound_active" || run.status === "at_destination" || run.status === "return_active") && (
                                <DropdownMenuItem onClick={() => handleLaunch(run.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Continue
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/special-use-runs/${run.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Group</div>
                            <div className="font-medium">{run.group.name}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-muted-foreground">Date</div>
                              <div className="font-medium">{format(new Date(run.run_date), "MMM d, yyyy")}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Departure</div>
                              <div className="font-medium">{formatTimeString(run.scheduled_departure_time)}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Return Time</div>
                            <div className="font-medium">{formatTimeString(run.scheduled_return_time)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* DESKTOP TABLE LAYOUT */}
                <div className="hidden md:block border rounded-lg bg-background overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run Name</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Departure</TableHead>
                        <TableHead>Return</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.run_name}</TableCell>
                          <TableCell>{run.group.name}</TableCell>
                          <TableCell>{format(new Date(run.run_date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{formatTimeString(run.scheduled_departure_time)}</TableCell>
                          <TableCell>{formatTimeString(run.scheduled_return_time)}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {run.status === "scheduled" && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedRun(run);
                                      setDialogOpen(true);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleLaunch(run.id)}>
                                      <Play className="h-4 w-4 mr-2" />
                                      Launch
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(run.status === "outbound_active" || run.status === "at_destination" || run.status === "return_active") && (
                                  <DropdownMenuItem onClick={() => handleLaunch(run.id)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Continue
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/dashboard/special-use-runs/${run.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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
      </main>
    </>
  );
}
