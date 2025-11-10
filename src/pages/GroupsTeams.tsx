import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Search, Users, Calendar, Edit, Trash2, UserCog } from "lucide-react";

import { SpecialUseGroupDialog } from "@/components/SpecialUseGroupDialog";
import { ManageGroupStudentsDialog } from "@/components/ManageGroupStudentsDialog";
import { ManageGroupManagersDialog } from "@/components/ManageGroupManagersDialog";
import { SpecialUseRunDialog } from "@/components/SpecialUseRunDialog";
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
};

export default function SpecialUseGroups() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<SpecialUseGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [managersDialogOpen, setManagersDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<SpecialUseGroup | null>(null);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ["special-use-groups", user?.id],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from("special_use_groups")
        .select("*")
        .order("name");

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
    enabled: !!user,
  });

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading groups...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No groups found matching your search" : "No groups yet. Create one to get started!"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Managers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{getGroupTypeBadge(group.group_type)}</TableCell>
                  <TableCell className="max-w-xs truncate">{group.description || "-"}</TableCell>
                  <TableCell className="text-center">{group.student_count}</TableCell>
                  <TableCell className="text-center">{group.manager_count}</TableCell>
                  <TableCell>
                    <Badge variant={group.is_active ? "default" : "secondary"}>
                      {group.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setStudentsDialogOpen(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setManagersDialogOpen(true);
                        }}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setScheduleDialogOpen(true);
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGroupToDelete(group);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
