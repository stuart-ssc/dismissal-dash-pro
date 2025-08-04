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
import { Search, Plus, Edit, MoreHorizontal, ChevronDown, Bus, Users, Calendar, BarChart3 } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

interface TransportationRecord {
  id: string;
  route_name: string;
  bus_number: string;
  driver_name: string;
  students_count: number;
  departure_time: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

const Transportation = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [transportation, setTransportation] = useState<TransportationRecord[]>([]);
  const [filteredTransportation, setFilteredTransportation] = useState<TransportationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof TransportationRecord>('route_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransportationRecord | null>(null);
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
    fetchTransportation();
  }, [user]);

  const fetchTransportation = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Mock data for transportation records
      const mockData: TransportationRecord[] = [
        {
          id: '1',
          route_name: 'Route A - North',
          bus_number: 'BUS-001',
          driver_name: 'John Smith',
          students_count: 45,
          departure_time: '08:00',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          route_name: 'Route B - South',
          bus_number: 'BUS-002',
          driver_name: 'Sarah Johnson',
          students_count: 38,
          departure_time: '08:15',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          route_name: 'Route C - East',
          bus_number: 'BUS-003',
          driver_name: 'Mike Davis',
          students_count: 42,
          departure_time: '08:30',
          status: 'maintenance',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          route_name: 'Route D - West',
          bus_number: 'BUS-004',
          driver_name: 'Lisa Wilson',
          students_count: 35,
          departure_time: '08:45',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setTransportation(mockData);
      setFilteredTransportation(mockData);
    } catch (error) {
      console.error('Error fetching transportation data:', error);
      toast.error('Failed to load transportation data');
    } finally {
      setIsLoading(false);
    }
  };

  // Search and filter logic
  useEffect(() => {
    let filtered = transportation.filter(record => {
      const matchesSearch = 
        record.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.driver_name.toLowerCase().includes(searchTerm.toLowerCase());
      
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

    setFilteredTransportation(filtered);
    setCurrentPage(1);
  }, [transportation, searchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransportation.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransportation = filteredTransportation.slice(startIndex, endIndex);

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

  const getStatusBadge = (status: TransportationRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Maintenance</Badge>;
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
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold">Transportation</h1>
                <p className="text-sm text-muted-foreground">
                  Manage school transportation routes and buses
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
                  <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{transportation.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active transportation routes
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
                    {transportation.reduce((sum, route) => sum + route.students_count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Students using transportation
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Buses</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {transportation.filter(route => route.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently operational
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Departure</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8:22 AM</div>
                  <p className="text-xs text-muted-foreground">
                    Average departure time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transportation Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Transportation Management</CardTitle>
                    <CardDescription>
                      Manage bus routes, drivers, and schedules
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Route
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
                        placeholder="Search routes, buses, or drivers..."
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
                        <DropdownMenuItem onClick={() => handleFilterChange('maintenance')}>
                          Maintenance
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Transportation Table */}
                  <div className="rounded-md border bg-background/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-muted/50">
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('route_name', sortBy === 'route_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Route Name
                            {sortBy === 'route_name' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('bus_number', sortBy === 'bus_number' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Bus Number
                            {sortBy === 'bus_number' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => handleSortChange('driver_name', sortBy === 'driver_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Driver
                            {sortBy === 'driver_name' && (
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
                            onClick={() => handleSortChange('departure_time', sortBy === 'departure_time' && sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            Departure
                            {sortBy === 'departure_time' && (
                              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTransportation.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {searchTerm || filterStatus !== 'all' 
                                ? 'No transportation routes match your search criteria.' 
                                : 'No transportation routes found.'
                              }
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentTransportation.map((route) => (
                            <TableRow key={route.id} className="border-border hover:bg-muted/30">
                              <TableCell className="font-medium">{route.route_name}</TableCell>
                              <TableCell>{route.bus_number}</TableCell>
                              <TableCell>{route.driver_name}</TableCell>
                              <TableCell>{route.students_count}</TableCell>
                              <TableCell>{route.departure_time}</TableCell>
                              <TableCell>{getStatusBadge(route.status)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                    <DropdownMenuItem onClick={() => setEditingRecord(route)}>
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
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTransportation.length)} of {filteredTransportation.length} routes
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
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Transportation;