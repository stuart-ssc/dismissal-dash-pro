import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useDistrictSchools, useSchoolMutations } from "@/hooks/useDistrictSchools";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { MoreHorizontal, Plus, Search, Building2, MapPin } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DistrictSchools() {
  const { data: schools, isLoading } = useDistrictSchools();
  const { updateSchoolStatus } = useSchoolMutations();
  const { switchSchool } = useDistrictAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSchools = schools?.filter((school) =>
    school.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = schools?.filter((s) => s.verification_status === "verified").length || 0;
  const inactiveCount = schools?.filter((s) => s.verification_status !== "verified").length || 0;

  if (isLoading) {
    return <div className="p-6">Loading schools...</div>;
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Total Schools</CardDescription>
            <CardTitle className="text-3xl">{schools?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl">{inactiveCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Schools Table/Cards */}
      <Card className="shadow-elevated border-0 bg-card backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Schools</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Manage schools within your district
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          {isMobile && (
            <div className="space-y-3 md:hidden">
              {filteredSchools?.map((school) => (
                <Card key={school.id} className="bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {school.school_name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={school.verification_status === "verified" ? "default" : "secondary"}>
                            {school.verification_status || "unverified"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => switchSchool(school.id)}>
                            View School
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit School</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {school.city && school.state && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {school.city}, {school.state}
                        </div>
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
                  <TableHead>School Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools?.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {school.school_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {school.city && school.state
                        ? `${school.city}, ${school.state}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={school.verification_status === "verified" ? "default" : "secondary"}>
                        {school.verification_status || "unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => switchSchool(school.id)}>
                            View School
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit School</DropdownMenuItem>
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
