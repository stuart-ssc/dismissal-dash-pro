import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Search, Users, Calendar, Edit, Trash2, UserCog, Copy, Download, MoreHorizontal, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { convertToCSV, downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SpecialUseGroupDialog } from "@/components/SpecialUseGroupDialog";
import { ManageGroupStudentsDialog } from "@/components/ManageGroupStudentsDialog";
import { ManageGroupManagersDialog } from "@/components/ManageGroupManagersDialog";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
import { GroupMigrationDialog } from "@/components/GroupMigrationDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SpecialUseGroup = {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  is_active: boolean;
  created_at: string;
  student_count?: number;
  manager_count?: number;
  academic_session_id?: string | null;
  session?: { session_name: string } | null;
};

export default function SpecialUseGroups() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<SpecialUseGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [managersDialogOpen, setManagersDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<SpecialUseGroup | null>(null);
  const [academicSessions, setAcademicSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();

  useEffect(() => {
    const fetchSessions = async () => {
      if (!schoolId) return;
      
      const { data: sessions } = await supabase
        .from("academic_sessions")
        .select("*")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });

      if (sessions) {
        setAcademicSessions(sessions);
        const activeSession = sessions.find((s) => s.is_active);
        setSelectedSessionId(activeSession?.id || sessions[0]?.id || null);
      }
    };

    fetchSessions();
  }, [schoolId]);

  const { data: groups = [], isLoading, refetch } = useQuery<SpecialUseGroup[]>({
    queryKey: ["special-use-groups", user?.id, selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];

      let query = supabase
        .from("special_use_groups")
        .select("id, name, description, group_type, is_active, created_at, academic_session_id, session:academic_sessions(session_name)")
        .eq("academic_session_id", selectedSessionId);

      const { data: groupsData, error } = await query.order("name");

      if (error) throw error;

      // Get counts for each group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const [studentsRes, managersRes] = await Promise.all([
            supabase
              .from("special_use_group_students")
              .select("id", { count: "exact", head: true })
              .eq("group_id", group.id),
            supabase
              .from("special_use_group_managers")
              .select("id", { count: "exact", head: true })
              .eq("group_id", group.id),
          ]);

          return {
            ...group,
            student_count: studentsRes.count || 0,
            manager_count: managersRes.count || 0,
          };
        })
      );

      return groupsWithCounts as SpecialUseGroup[];
    },
    enabled: !!user && !!selectedSessionId,
  });

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || group.group_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredGroups.length);

  const handleExportCSV = () => {
    if (filteredGroups.length === 0) {
      toast.error("No groups to export");
      return;
    }

    const exportData = filteredGroups.map(group => ({
      Name: group.name,
      Type: group.group_type === 'field_trip' ? 'Field Trip' : 
            group.group_type === 'athletics' ? 'Athletics' : 
            group.group_type === 'club' ? 'Club' : 'Other',
      'Academic Session': group.session?.session_name || 'Not Assigned',
      Description: group.description || '',
      'Student Count': group.student_count || 0,
      'Manager Count': group.manager_count || 0,
      Status: group.is_active ? 'Active' : 'Inactive',
      'Created Date': formatDateForCSV(group.created_at),
    }));

    const csv = convertToCSV(
      exportData,
      ['Name', 'Type', 'Academic Session', 'Description', 'Student Count', 'Manager Count', 'Status', 'Created Date']
    );

    const filename = `special-use-groups-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
    toast.success(`Exported ${filteredGroups.length} groups to CSV`);
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;

    try {
      const { error } = await supabase
        .from("special_use_groups")
        .delete()
        .eq("id", groupToDelete.id);

      if (error) throw error;

      toast.success("Group deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group");
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const getGroupTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      field_trip: { label: "Field Trip", variant: "default" },
      athletics: { label: "Athletics", variant: "secondary" },
      club: { label: "Club", variant: "outline" },
      other: { label: "Other", variant: "outline" },
    };
    const config = variants[type] || variants.other;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <main className="flex-1 p-6 space-y-6">
        {/* Main Data Card */}
        <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle>Groups & Teams</CardTitle>
              {selectedSessionId && academicSessions.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">
              Create and manage special use groups for field trips, athletics, clubs, and other activities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-2 py-3 border-b">
                  <Label className="text-xs font-medium mb-2 block">
                    Academic Year
                  </Label>
                  <Select
                    value={selectedSessionId || undefined}
                    onValueChange={setSelectedSessionId}
                  >
                    <SelectTrigger className="w-full">
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
                    <Badge variant="outline" className="mt-2">
                      Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                    </Badge>
                  )}
                </div>

                <DropdownMenuItem 
                  onClick={handleExportCSV}
                  disabled={filteredGroups.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => setMigrationDialogOpen(true)}
                  disabled={!selectedSessionId || !schoolId}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Migrate Groups
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </CardHeader>
          <CardContent>
            {/* Search Field */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="field_trip">Field Trip</SelectItem>
                  <SelectItem value="athletics">Athletics</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Groups Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No groups found matching your search" : "No groups yet. Create one to get started!"}
              </div>
            ) : (
              <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {paginatedGroups.map((group) => (
                  <Card key={group.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate">{group.name}</CardTitle>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getGroupTypeBadge(group.group_type)}
                            <Badge variant={group.is_active ? "default" : "secondary"}>
                              {group.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group);
                                setStudentsDialogOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Manage Students
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group);
                                setManagersDialogOpen(true);
                              }}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Manage Managers
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group);
                                setScheduleDialogOpen(true);
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Run
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setGroupToDelete(group);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Students</div>
                          <div className="font-medium">{group.student_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Managers</div>
                          <div className="font-medium">{group.manager_count}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block rounded-md border bg-background/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Managers</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id} className="border-border hover:bg-muted/30">
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{getGroupTypeBadge(group.group_type)}</TableCell>
                          <TableCell><Badge variant="secondary">{group.student_count}</Badge></TableCell>
                          <TableCell>{group.manager_count}</TableCell>
                          <TableCell>
                            <Badge variant={group.is_active ? "default" : "secondary"}>
                              {group.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedGroup(group);
                                    setStudentsDialogOpen(true);
                                  }}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Manage Students
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedGroup(group);
                                    setManagersDialogOpen(true);
                                  }}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Manage Managers
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedGroup(group);
                                    setScheduleDialogOpen(true);
                                  }}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Schedule Run
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedGroup(group);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Group
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setGroupToDelete(group);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Group
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

      <SpecialUseGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selectedGroup}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          setSelectedGroup(null);
        }}
      />

      <ManageGroupStudentsDialog
        open={studentsDialogOpen}
        onOpenChange={setStudentsDialogOpen}
        group={selectedGroup}
        onSuccess={refetch}
      />

      <ManageGroupManagersDialog
        open={managersDialogOpen}
        onOpenChange={setManagersDialogOpen}
        group={selectedGroup}
        onSuccess={refetch}
      />

      <SpecialUseRunDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        run={null}
        preselectedGroupId={selectedGroup?.id}
        onSuccess={() => {
          setScheduleDialogOpen(false);
          toast.success("Run scheduled successfully");
        }}
      />

      {selectedSessionId && schoolId && (
        <GroupMigrationDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          schoolId={schoolId}
          targetSessionId={selectedSessionId}
          targetSessionName={
            academicSessions.find((s) => s.id === selectedSessionId)?.session_name || ""
          }
          onSuccess={() => {
            refetch();
            toast.success("Groups migrated successfully");
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone and will also delete all associated runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
    </>
  );
}
