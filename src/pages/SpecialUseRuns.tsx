import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Play, Eye } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
import { toast } from "sonner";

type SpecialUseRun = {
  id: string;
  run_name: string;
  run_date: string;
  status: string;
  scheduled_departure_time: string | null;
  scheduled_return_time: string | null;
  group: {
    name: string;
    group_type: string;
  };
  buses: { bus_number: string }[];
};

export default function SpecialUseRuns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ["special-use-runs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_use_runs")
        .select(`
          *,
          group:special_use_groups(name, group_type),
          buses:special_use_run_buses(
            bus:buses(bus_number)
          )
        `)
        .order("run_date", { ascending: false });

      if (error) throw error;

      return data.map(run => ({
        ...run,
        group: run.group,
        buses: run.buses.map((b: any) => b.bus)
      })) as SpecialUseRun[];
    },
    enabled: !!user,
  });

  const filteredRuns = runs.filter((run) =>
    run.run_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    run.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">Special Use Runs</h1>
            <p className="text-sm text-muted-foreground">
              Manage and track special transportation runs
            </p>
          </div>
        </div>
        <Button onClick={() => { setSelectedRun(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Run
        </Button>
      </header>
      
      <main className="flex-1 p-6 space-y-6">
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
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading runs...</div>
      ) : filteredRuns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No runs found matching your search" : "No runs scheduled yet"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run Name</TableHead>
                <TableHead>Group</TableHead>
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
                  <TableCell className="font-medium">{run.run_name}</TableCell>
                  <TableCell>{run.group.name}</TableCell>
                  <TableCell>{format(new Date(run.run_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {run.scheduled_departure_time || "-"}
                  </TableCell>
                  <TableCell>
                    {run.scheduled_return_time || "-"}
                  </TableCell>
                  <TableCell>
                    {run.buses.map(b => b.bus_number).join(", ")}
                  </TableCell>
                  <TableCell>{getStatusBadge(run.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {run.status === "scheduled" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLaunch(run.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Launch
                        </Button>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard/special-use-runs/${run.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
      </main>
    </>
  );
}
