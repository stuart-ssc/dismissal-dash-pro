import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, MoreHorizontal, ChevronDown, GraduationCap, Users, Calendar, BarChart3 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

interface DismissalRecord {
  id: string;
  plan_name: string;
  plan_type: string;
  supervisor: string;
  students_count: number;
  dismissal_time: string;
  status: 'active' | 'inactive' | 'scheduled';
  created_at: string;
  updated_at: string;
}

const Dismissals = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [dismissals, setDismissals] = useState<DismissalRecord[]>([]);
  const [filteredDismissals, setFilteredDismissals] = useState<DismissalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof DismissalRecord>('plan_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'scheduled'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DismissalRecord | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && userRole !== 'school_admin') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchDismissals();
    if (user) {
      fetchSchoolName();
    }
  }, [user]);

  const fetchSchoolName = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('school_name')
          .eq('id', profile.school_id)
          .single();

        if (school?.school_name) {
          setSchoolName(school.school_name);
        }
      }
    } catch (error) {
      console.error('Error fetching school name:', error);
    }
  };

  const fetchDismissals = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Mock data for dismissal records
      const mockData: DismissalRecord[] = [
        {
          id: '1',
          plan_name: 'Bus Riders - Route A',
          plan_type: 'Bus Transportation',
          supervisor: 'Ms. Johnson',
          students_count: 45,
          dismissal_time: '15:15',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          plan_name: 'Parent Pickup',
          plan_type: 'Parent/Guardian',
          supervisor: 'Mr. Smith',
          students_count: 38,
          dismissal_time: '15:30',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          plan_name: 'After School Program',
          plan_type: 'Extended Care',
          supervisor: 'Mrs. Davis',
          students_count: 22,
          dismissal_time: '17:00',
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          plan_name: 'Walker Group',
          plan_type: 'Walking',
          supervisor: 'Mr. Wilson',
          students_count: 15,
          dismissal_time: '15:25',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setDismissals(mockData);
      setFilteredDismissals(mockData);
    } catch (error) {
      console.error('Error fetching dismissal data:', error);
      toast.error('Failed to load dismissal data');
    } finally {
      setIsLoading(false);
    }
  };

  // Search and filter logic
  useEffect(() => {
    let filtered = dismissals.filter(record => {
      const matchesSearch = 
        record.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.plan_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supervisor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDismissals(filtered);
    setCurrentPage(1);
  }, [dismissals, searchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredDismissals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDismissals = filteredDismissals.slice(startIndex, endIndex);

  // Reset page when filters change
  const handleFilterChange = (newFilterStatus?: typeof filterStatus) => {
    setCurrentPage(1);
    if (newFilterStatus !== undefined) setFilterStatus(newFilterStatus);
  };

  const handleSortChange = (newSortBy: typeof sortBy, newSortOrder?: typeof sortOrder) => {
    setSortBy(newSortBy);
    if (newSortOrder) setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: DismissalRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'school_admin') {
    return null;
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">{schoolName || 'Dismissal Plans'}</h1>
            <p className="text-sm text-muted-foreground">
              Manage student dismissal plans and assignments
            </p>
          </div>
        </div>
        <Button onClick={signOut} variant="outline">
          Sign Out
        </Button>
      </header>

      <main className="flex-1 p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dismissals.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active dismissal plans
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dismissals.reduce((sum, plan) => sum + plan.students_count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students with dismissal plans
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dismissals.filter(plan => plan.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Dismissal</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3:22 PM</div>
                  <p className="text-xs text-muted-foreground">
                    Average dismissal time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dismissal Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Dismissal Plan Management</CardTitle>
                    <CardDescription>
                      Manage student dismissal plans and schedules
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search plans, types, or supervisors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Status Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10">
                          Status: {filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                          All Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('active')}>
                          Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('inactive')}>
                          Inactive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFilterChange('scheduled')}>
                          Scheduled
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Dismissal Table */}
                  <div className="rounded-md border bg-background/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-muted/50">
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('plan_name', sortBy === 'plan_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Plan Name
                            {sortBy === 'plan_name' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('plan_type', sortBy === 'plan_type' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Type
                            {sortBy === 'plan_type' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('supervisor', sortBy === 'supervisor' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Supervisor
                            {sortBy === 'supervisor' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('students_count', sortBy === 'students_count' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Students
                            {sortBy === 'students_count' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('dismissal_time', sortBy === 'dismissal_time' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Dismissal Time
                            {sortBy === 'dismissal_time' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentDismissals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {searchTerm || filterStatus !== 'all' 
                                ? 'No dismissal plans match your search criteria.' 
                                : 'No dismissal plans found.'
                              }
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentDismissals.map((plan) => (
                            <TableRow key={plan.id} className="border-border hover:bg-muted/30">
                              <TableCell className="font-medium">{plan.plan_name}</TableCell>
                              <TableCell>{plan.plan_type}</TableCell>
                              <TableCell>{plan.supervisor}</TableCell>
                              <TableCell>{plan.students_count}</TableCell>
                              <TableCell>{plan.dismissal_time}</TableCell>
                              <TableCell>{getStatusBadge(plan.status)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                    <DropdownMenuItem onClick={() => setEditingRecord(plan)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredDismissals.length)} of {filteredDismissals.length} plans
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
    </>
  );
};

export default Dismissals;