import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useDistrictUsers, useUserMutations, type DistrictUser } from "@/hooks/useDistrictUsers";
import { useDistrictSchools } from "@/hooks/useDistrictSchools";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import InviteUserDialog from "@/components/InviteUserDialog";
import TransferUserDialog from "@/components/TransferUserDialog";

// Format role for display (capitalize first letter, format underscores)
const formatRole = (role: string) => {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get badge variant based on role
const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "success" | "outline" => {
  switch (role) {
    case 'system_admin':
      return 'destructive'; // Red for highest privilege
    case 'district_admin':
      return 'default'; // Blue/primary for district level
    case 'school_admin':
      return 'success'; // Green for school admins
    case 'teacher':
      return 'secondary'; // Gray for teachers
    default:
      return 'outline';
  }
};

export default function DistrictUsers() {
  const [schoolFilter, setSchoolFilter] = useState<number | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DistrictUser | null>(null);

  const { data: users, isLoading, refetch } = useDistrictUsers(schoolFilter);
  const { data: schools } = useDistrictSchools();
  const { archiveUser } = useUserMutations();
  const isMobile = useIsMobile();

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const schoolAdminCount = users?.filter((u) => u.role === "school_admin").length || 0;
  const teacherCount = users?.filter((u) => u.role === "teacher").length || 0;

  const handleTransferClick = (user: DistrictUser) => {
    setSelectedUser(user);
    setTransferDialogOpen(true);
  };

  const handleArchiveClick = (user: DistrictUser) => {
    setSelectedUser(user);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (selectedUser) {
      await archiveUser.mutateAsync(selectedUser.id);
      setArchiveDialogOpen(false);
      setSelectedUser(null);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={String(schoolFilter)} onValueChange={(v) => setSchoolFilter(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filter by school" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={String(school.id)}>
                  {school.school_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="district_admin">District Admin</SelectItem>
              <SelectItem value="school_admin">School Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="system_admin">System Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{users?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>School Admins</CardDescription>
            <CardTitle className="text-3xl">{schoolAdminCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Teachers</CardDescription>
            <CardTitle className="text-3xl">{teacherCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table/Cards */}
      <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Users</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Manage school administrators and teachers across your district
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          {isMobile && (
            <div className="space-y-3 md:hidden">
              {filteredUsers?.map((user) => (
                <Card key={user.id} className="bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {user.first_name} {user.last_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={getRoleBadgeVariant(user.role)}>{formatRole(user.role)}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTransferClick(user)}>
                            Transfer School
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleArchiveClick(user)}
                            className="text-destructive"
                          >
                            Archive User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      {user.school_name || (
                        <Badge variant="secondary" className="text-xs">District Office</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>{formatRole(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.school_name || (
                        <Badge variant="secondary">District Office</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTransferClick(user)}>
                            Transfer School
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleArchiveClick(user)}
                            className="text-destructive"
                          >
                            Archive User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => refetch()}
      />

      {selectedUser && (
        <TransferUserDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          userId={selectedUser.id}
          userName={`${selectedUser.first_name} ${selectedUser.last_name}`}
          currentSchoolName={selectedUser.school_name || "Unknown"}
        />
      )}

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {selectedUser?.first_name} {selectedUser?.last_name}? 
              This will remove their access to the system. This action can be reversed by a system administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
