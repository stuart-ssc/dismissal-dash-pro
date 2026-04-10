import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDistrictICConnections } from "@/hooks/useDistrictICConnections";
import { MoreHorizontal, Database, CheckCircle2, XCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

export default function DistrictICIntegrations() {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useDistrictICConnections();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isMobile = useIsMobile();

  const schoolMappings = connections?.schoolMappings || [];

  const filteredConnections = schoolMappings.filter((conn) => {
    if (statusFilter === "connected") return conn.is_connected;
    if (statusFilter === "not-connected") return !conn.is_connected;
    return true;
  });

  const connectedCount = schoolMappings.filter((c) => c.is_connected).length || 0;
  const notConnectedCount = schoolMappings.filter((c) => !c.is_connected).length || 0;

  if (isLoading) {
    return <div className="p-6">Loading IC integrations...</div>;
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="not-connected">Not Connected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Total Schools</CardDescription>
            <CardTitle className="text-3xl">{connections?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Connected</CardDescription>
            <CardTitle className="text-3xl text-green-600">{connectedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Not Connected</CardDescription>
            <CardTitle className="text-3xl text-muted-foreground">{notConnectedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* IC Integrations Table/Cards */}
      <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Infinite Campus Integrations</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Manage Infinite Campus connections across your district
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          {isMobile && (
            <div className="space-y-3 md:hidden">
              {filteredConnections?.map((conn) => (
                <Card key={conn.school_id} className="bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {conn.school_name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge
                            variant={conn.is_connected ? "default" : "secondary"}
                            className="gap-1"
                          >
                            {conn.is_connected ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Connected
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Not Connected
                              </>
                            )}
                          </Badge>
                          {conn.last_sync_status && (
                            <Badge variant="outline">{conn.last_sync_status}</Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {conn.is_connected ? (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=sync`)}>
                                Sync Now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=settings`)}>
                                Test Connection
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=settings`)}>
                                Settings
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}`)}>
                              Configure Integration
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  {conn.is_connected && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {conn.last_sync_at && (
                          <div className="text-muted-foreground">
                            Last sync: {formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true })}
                          </div>
                        )}
                        {conn.configured_by_name && (
                          <div className="text-muted-foreground">
                            Configured by: {conn.configured_by_name} ({conn.configured_by_role})
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>IC Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Configured By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections?.map((conn) => (
                  <TableRow key={conn.school_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        {conn.school_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={conn.is_connected ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {conn.is_connected ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Not Connected
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {conn.last_sync_at
                        ? formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {conn.configured_by_name ? (
                        <div className="text-sm">
                          <div>{conn.configured_by_name}</div>
                          <div className="text-muted-foreground text-xs">
                            {conn.configured_by_role}
                          </div>
                        </div>
                      ) : (
                        "N/A"
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
                          {conn.is_connected ? (
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=sync`)}>
                                Sync Now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=settings`)}>
                                Test Connection
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}?tab=settings`)}>
                                Settings
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => navigate(`/district-dash/ic-integrations/${conn.school_id}`)}>
                              Configure Integration
                            </DropdownMenuItem>
                          )}
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
    </div>
  );
}
