import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AcademicSessionAssignment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());

  // Fetch academic sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["academic-sessions-assignment"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      const { data, error } = await supabase
        .from("academic_sessions")
        .select("*")
        .eq("school_id", profile?.school_id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch groups without sessions
  const { data: groupsWithoutSession = [], refetch: refetchGroups } = useQuery({
    queryKey: ["groups-without-session"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      const { data, error } = await supabase
        .from("special_use_groups")
        .select("id, name, group_type, created_at")
        .eq("school_id", profile?.school_id)
        .is("academic_session_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch runs without sessions
  const { data: runsWithoutSession = [], refetch: refetchRuns } = useQuery({
    queryKey: ["runs-without-session"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      const { data, error } = await supabase
        .from("special_use_runs")
        .select("id, run_name, run_date, group:special_use_groups(name)")
        .eq("school_id", profile?.school_id)
        .is("academic_session_id", null)
        .order("run_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Auto-select active session
  useEffect(() => {
    const activeSession = sessions.find(s => s.is_active);
    if (activeSession && !selectedSession) {
      setSelectedSession(activeSession.id);
    }
  }, [sessions, selectedSession]);

  const assignSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSession) {
        throw new Error("Please select an academic session");
      }

      const groupIds = Array.from(selectedGroups);
      const runIds = Array.from(selectedRuns);

      if (groupIds.length === 0 && runIds.length === 0) {
        throw new Error("Please select at least one group or run to assign");
      }

      // Update groups
      if (groupIds.length > 0) {
        const { error: groupError } = await supabase
          .from("special_use_groups")
          .update({ academic_session_id: selectedSession })
          .in("id", groupIds);

        if (groupError) throw groupError;
      }

      // Update runs
      if (runIds.length > 0) {
        const { error: runError } = await supabase
          .from("special_use_runs")
          .update({ academic_session_id: selectedSession })
          .in("id", runIds);

        if (runError) throw runError;
      }

      return { groups: groupIds.length, runs: runIds.length };
    },
    onSuccess: (result) => {
      toast.success(`Successfully assigned ${result.groups} groups and ${result.runs} runs to the selected session`);
      setSelectedGroups(new Set());
      setSelectedRuns(new Set());
      refetchGroups();
      refetchRuns();
      queryClient.invalidateQueries({ queryKey: ["special-use-groups"] });
      queryClient.invalidateQueries({ queryKey: ["special-use-runs"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign sessions");
    },
  });

  const handleToggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleToggleRun = (runId: string) => {
    const newSelected = new Set(selectedRuns);
    if (newSelected.has(runId)) {
      newSelected.delete(runId);
    } else {
      newSelected.add(runId);
    }
    setSelectedRuns(newSelected);
  };

  const handleSelectAllGroups = () => {
    if (selectedGroups.size === groupsWithoutSession.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groupsWithoutSession.map(g => g.id)));
    }
  };

  const handleSelectAllRuns = () => {
    if (selectedRuns.size === runsWithoutSession.length) {
      setSelectedRuns(new Set());
    } else {
      setSelectedRuns(new Set(runsWithoutSession.map(r => r.id)));
    }
  };

  const totalWithoutSession = groupsWithoutSession.length + runsWithoutSession.length;

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Session Assignment</h1>
          <p className="text-muted-foreground">
            Assign academic sessions to groups and runs that don't have one
          </p>
        </div>
      </div>

      {totalWithoutSession === 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>All Set!</AlertTitle>
          <AlertDescription>
            All special use groups and runs have academic sessions assigned.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Found {totalWithoutSession} item(s) without academic session assignment.
            Please assign them to the appropriate academic year below.
          </AlertDescription>
        </Alert>
      )}

      {totalWithoutSession > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Select Academic Session
            </CardTitle>
            <CardDescription>
              Choose the academic session to assign to selected groups and runs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Academic Year</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.session_name} ({session.session_code})
                      {session.is_active && " - Active"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedGroups.size + selectedRuns.size} item(s) selected
              </div>
              <Button
                onClick={() => assignSessionMutation.mutate()}
                disabled={
                  !selectedSession ||
                  (selectedGroups.size === 0 && selectedRuns.size === 0) ||
                  assignSessionMutation.isPending
                }
              >
                {assignSessionMutation.isPending ? "Assigning..." : "Assign Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {groupsWithoutSession.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Groups Without Session</CardTitle>
                <CardDescription>
                  {groupsWithoutSession.length} group(s) need session assignment
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAllGroups}>
                {selectedGroups.size === groupsWithoutSession.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedGroups.size === groupsWithoutSession.length && groupsWithoutSession.length > 0}
                        onCheckedChange={handleSelectAllGroups}
                      />
                    </TableHead>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsWithoutSession.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedGroups.has(group.id)}
                          onCheckedChange={() => handleToggleGroup(group.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {group.group_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(group.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {runsWithoutSession.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Runs Without Session</CardTitle>
                <CardDescription>
                  {runsWithoutSession.length} run(s) need session assignment
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAllRuns}>
                {selectedRuns.size === runsWithoutSession.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRuns.size === runsWithoutSession.length && runsWithoutSession.length > 0}
                        onCheckedChange={handleSelectAllRuns}
                      />
                    </TableHead>
                    <TableHead>Run Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Run Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsWithoutSession.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRuns.has(run.id)}
                          onCheckedChange={() => handleToggleRun(run.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{run.run_name}</TableCell>
                      <TableCell>{run.group?.name || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(run.run_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
