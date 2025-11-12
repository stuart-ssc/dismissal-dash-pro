import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";

interface GroupMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
  targetSessionId: string;
  targetSessionName: string;
  onSuccess?: () => void;
}

interface Group {
  id: string;
  name: string;
  group_type: string;
  description: string | null;
  academic_session_id: string;
  session_name: string;
  manager_count: number;
  student_count: number;
}

export function GroupMigrationDialog({
  open,
  onOpenChange,
  schoolId,
  targetSessionId,
  targetSessionName,
  onSuccess,
}: GroupMigrationDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sourceSessionId, setSourceSessionId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (open && schoolId) {
      fetchSessions();
    }
  }, [open, schoolId]);

  useEffect(() => {
    if (sourceSessionId) {
      fetchGroups();
    } else {
      setGroups([]);
      setSelectedGroups(new Set());
    }
  }, [sourceSessionId, groupTypeFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("academic_sessions")
        .select("id, session_name, start_date, end_date, is_active")
        .eq("school_id", schoolId)
        .neq("id", targetSessionId) // Don't show the target session
        .order("start_date", { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      // Auto-select the most recent session (likely previous year)
      if (data && data.length > 0) {
        setSourceSessionId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load academic sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);

      // Get groups with manager and student counts
      const { data: groupsData, error: groupsError } = await supabase
        .from("special_use_groups")
        .select(`
          id,
          name,
          group_type,
          description,
          academic_session_id,
          academic_sessions!inner(session_name)
        `)
        .eq("school_id", schoolId)
        .eq("academic_session_id", sourceSessionId)
        .eq("is_active", true)
        .order("name");

      if (groupsError) throw groupsError;

      // Get manager counts
      const groupIds = groupsData?.map((g) => g.id) || [];
      const { data: managerCounts } = await supabase
        .from("special_use_group_managers")
        .select("group_id")
        .in("group_id", groupIds);

      const { data: studentCounts } = await supabase
        .from("special_use_group_students")
        .select("group_id")
        .in("group_id", groupIds);

      // Count by group
      const managerCountMap = (managerCounts || []).reduce((acc, m) => {
        acc[m.group_id] = (acc[m.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const studentCountMap = (studentCounts || []).reduce((acc, s) => {
        acc[s.group_id] = (acc[s.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedGroups = groupsData?.map((group: any) => ({
        id: group.id,
        name: group.name,
        group_type: group.group_type,
        description: group.description,
        academic_session_id: group.academic_session_id,
        session_name: group.academic_sessions.session_name,
        manager_count: managerCountMap[group.id] || 0,
        student_count: studentCountMap[group.id] || 0,
      })) || [];

      setGroups(enrichedGroups);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.id)));
    }
  };

  const handleMigrate = async () => {
    if (selectedGroups.size === 0) {
      toast.error("Please select at least one group to migrate");
      return;
    }

    try {
      setMigrating(true);

      const { data, error } = await supabase.functions.invoke("migrate-special-use-groups", {
        body: {
          groupIds: Array.from(selectedGroups),
          targetSessionId,
          schoolId,
        },
      });

      if (error) throw error;

      toast.success(`Successfully migrated ${data.migratedCount} group(s) to ${targetSessionName}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error migrating groups:", error);
      toast.error(error.message || "Failed to migrate groups");
    } finally {
      setMigrating(false);
    }
  };

  const filteredGroups = groups.filter((group) => {
    if (groupTypeFilter === "all") return true;
    return group.group_type === groupTypeFilter;
  });

  const groupTypes = Array.from(new Set(groups.map((g) => g.group_type)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Migrate Groups to New Academic Year
          </DialogTitle>
          <DialogDescription>
            Copy special use groups from a previous academic year to{" "}
            <strong>{targetSessionName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Source Session Selector */}
          <div className="space-y-2">
            <Label>Copy Groups From</Label>
            <Select value={sourceSessionId} onValueChange={setSourceSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select academic year..." />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.session_name}
                    {session.is_active && " (Currently Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceSessionId && (
            <>
              {/* Group Type Filter */}
              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <Select value={groupTypeFilter} onValueChange={setGroupTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types ({groups.length})</SelectItem>
                    {groupTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")} (
                        {groups.filter((g) => g.group_type === type).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Only group structure and managers will be copied. Students must be added
                  separately after import/sync for the new year.
                </AlertDescription>
              </Alert>

              {/* Groups List */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base">
                    Select Groups ({selectedGroups.size} selected)
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                    disabled={filteredGroups.length === 0}
                  >
                    {selectedGroups.size === filteredGroups.length ? "Deselect" : "Select"} All
                  </Button>
                </div>

                <ScrollArea className="flex-1 border rounded-md">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Loading groups...
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No groups found for this session
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {filteredGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <Checkbox
                            checked={selectedGroups.has(group.id)}
                            onCheckedChange={() => toggleGroup(group.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{group.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {group.group_type.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            {group.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {group.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {group.manager_count} manager(s)
                              </span>
                              <span>•</span>
                              <span>{group.student_count} student(s) (won't be copied)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={migrating}>
            Cancel
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={selectedGroups.size === 0 || migrating}
          >
            {migrating ? (
              "Migrating..."
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Migrate {selectedGroups.size} Group{selectedGroups.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
