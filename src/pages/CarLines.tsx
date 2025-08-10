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
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, MoreHorizontal, Car, Users, ArrowLeft, Trash2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const carLineSchema = z.object({
  line_name: z.string().min(1, "Line name is required"),
  color: z.string().min(1, "Color is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  status: z.enum(["active", "inactive"]),
});

interface CarLineRecord {
  id: string;
  school_id: number;
  line_name: string;
  color: string;
  pickup_location: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const CarLines = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [carLines, setCarLines] = useState<CarLineRecord[]>([]);
  const [filteredCarLines, setFilteredCarLines] = useState<CarLineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof CarLineRecord>('line_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CarLineRecord | null>(null);
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
    fetchCarLines();
    fetchSchoolName();
  }, [user]);

  const fetchCarLines = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get user's school_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        console.error('No school_id found for user');
        setCarLines([]);
        setFilteredCarLines([]);
        return;
      }

      // Fetch car lines for the school
      const { data: carLinesData, error } = await supabase
        .from('car_lines')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('line_name');

      if (error) {
        console.error('Error fetching car lines:', error);
        toast.error('Failed to load car lines data');
        return;
      }

      setCarLines((carLinesData || []) as CarLineRecord[]);
      setFilteredCarLines((carLinesData || []) as CarLineRecord[]);
    } catch (error) {
      console.error('Error fetching car lines data:', error);
      toast.error('Failed to load car lines data');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Search and filter logic
  useEffect(() => {
    let filtered = carLines.filter(record => {
      const matchesSearch = 
        record.line_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.pickup_location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCarLines(filtered);
    setCurrentPage(1);
  }, [carLines, searchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCarLines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCarLines = filteredCarLines.slice(startIndex, endIndex);

  const getStatusBadge = (status: CarLineRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const form = useForm<z.infer<typeof carLineSchema>>({
    resolver: zodResolver(carLineSchema),
    defaultValues: {
      line_name: "",
      color: "#EF4444",
      pickup_location: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (editingRecord) {
      form.reset({
        line_name: editingRecord.line_name,
        color: editingRecord.color,
        pickup_location: editingRecord.pickup_location,
        status: editingRecord.status,
      });
    } else if (showAddDialog) {
      form.reset({
        line_name: "",
        color: "#EF4444",
        pickup_location: "",
        status: "active",
      });
    }
  }, [editingRecord, showAddDialog, form]);

  const handleFormSubmit = async (values: z.infer<typeof carLineSchema>) => {
    try {
      // Get user's school_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) {
        toast.error('No school found for user');
        return;
      }

      if (editingRecord) {
        // Update existing car line
        const { error } = await supabase
          .from('car_lines')
          .update({
            line_name: values.line_name,
            color: values.color,
            pickup_location: values.pickup_location,
            status: values.status,
          })
          .eq('id', editingRecord.id);

        if (error) {
          console.error('Error updating car line:', error);
          toast.error('Failed to update car line');
          return;
        }

        toast.success('Car line updated successfully');
        setEditingRecord(null);
      } else {
        // Add new car line
        const { error } = await supabase
          .from('car_lines')
          .insert({
            school_id: profile.school_id,
            line_name: values.line_name,
            color: values.color,
            pickup_location: values.pickup_location,
            status: values.status,
          });

        if (error) {
          console.error('Error creating car line:', error);
          toast.error('Failed to create car line');
          return;
        }

        toast.success('Car line created successfully');
        setShowAddDialog(false);
      }
      
      // Refresh the data
      await fetchCarLines();
      form.reset();
    } catch (error) {
      console.error('Error saving car line:', error);
      toast.error('Failed to save car line');
    }
  };

  const handleDeleteCarLine = async (carLine: CarLineRecord) => {
    if (!confirm(`Are you sure you want to delete ${carLine.line_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('car_lines')
        .delete()
        .eq('id', carLine.id);

      if (error) {
        console.error('Error deleting car line:', error);
        toast.error('Failed to delete car line');
        return;
      }

      toast.success('Car line deleted successfully');
      // Refresh the data
      await fetchCarLines();
    } catch (error) {
      console.error('Error deleting car line:', error);
      toast.error('Failed to delete car line');
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
            <h1 className="text-2xl font-bold">{schoolName || 'Car Lines'}</h1>
            <p className="text-sm text-muted-foreground">
              Manage car pickup lines and locations
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
          <div className="space-y-6">

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Car Lines Management
                  </CardTitle>
                  <CardDescription>
                    Organize and manage your school's car pickup lines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search car lines..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          Status: {filterStatus === 'all' ? 'All' : filterStatus}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                          All
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                          Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>
                          Inactive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex-1"></div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard/settings')}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Settings
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Car Line
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:text-primary"
                            onClick={() => setSortBy('line_name')}
                          >
                            Line Name
                          </TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Pickup Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentCarLines.map((carLine) => (
                          <TableRow key={carLine.id}>
                            <TableCell className="font-medium">
                              {carLine.line_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: carLine.color }}
                                />
                                {carLine.color}
                              </div>
                            </TableCell>
                            <TableCell>{carLine.pickup_location}</TableCell>
                            <TableCell>
                              {getStatusBadge(carLine.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingRecord(carLine)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteCarLine(carLine)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredCarLines.length)} of {filteredCarLines.length} car lines
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingRecord} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingRecord(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Car Line' : 'Add New Car Line'}
            </DialogTitle>
            <DialogDescription>
              {editingRecord 
                ? 'Update the car line information below.'
                : 'Create a new car pickup line for your school.'
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="line_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Red Line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" className="w-16 h-10" {...field} />
                        <Input placeholder="#EF4444" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pickup_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Entrance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full p-2 border rounded-md">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingRecord(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Update' : 'Create'} Car Line
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CarLines;