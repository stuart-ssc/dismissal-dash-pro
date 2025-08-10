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
import { Search, Plus, Edit, MoreHorizontal, Users, ArrowLeft, Trash2, MapPin } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";

const walkerLocationSchema = z.object({
  location_name: z.string().min(1, "Location name is required"),
  is_default: z.boolean(),
  status: z.enum(["active", "inactive"]),
});

interface WalkerLocationRecord {
  id: string;
  school_id: number;
  location_name: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const WalkerLocations = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [walkerLocations, setWalkerLocations] = useState<WalkerLocationRecord[]>([]);
  const [filteredWalkerLocations, setFilteredWalkerLocations] = useState<WalkerLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof WalkerLocationRecord>('location_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WalkerLocationRecord | null>(null);
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
    fetchWalkerLocations();
    fetchSchoolName();
  }, [user]);

  const fetchWalkerLocations = async () => {
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
        setWalkerLocations([]);
        setFilteredWalkerLocations([]);
        return;
      }

      // Fetch walker locations for the school
      const { data: walkerLocationsData, error } = await supabase
        .from('walker_locations')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('location_name');

      if (error) {
        console.error('Error fetching walker locations:', error);
        toast.error('Failed to load walker locations data');
        return;
      }

      setWalkerLocations((walkerLocationsData || []) as WalkerLocationRecord[]);
      setFilteredWalkerLocations((walkerLocationsData || []) as WalkerLocationRecord[]);
    } catch (error) {
      console.error('Error fetching walker locations data:', error);
      toast.error('Failed to load walker locations data');
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
    let filtered = walkerLocations.filter(record => {
      const matchesSearch = 
        record.location_name.toLowerCase().includes(searchTerm.toLowerCase());
      
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

    setFilteredWalkerLocations(filtered);
    setCurrentPage(1);
  }, [walkerLocations, searchTerm, filterStatus, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredWalkerLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWalkerLocations = filteredWalkerLocations.slice(startIndex, endIndex);

  const getStatusBadge = (status: WalkerLocationRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const form = useForm<z.infer<typeof walkerLocationSchema>>({
    resolver: zodResolver(walkerLocationSchema),
    defaultValues: {
      location_name: "",
      is_default: false,
      status: "active",
    },
  });

  useEffect(() => {
    if (editingRecord) {
      form.reset({
        location_name: editingRecord.location_name,
        is_default: editingRecord.is_default,
        status: editingRecord.status,
      });
    } else if (showAddDialog) {
      form.reset({
        location_name: "",
        is_default: false,
        status: "active",
      });
    }
  }, [editingRecord, showAddDialog, form]);

  const handleFormSubmit = async (values: z.infer<typeof walkerLocationSchema>) => {
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

      // If setting as default, unset other defaults first
      if (values.is_default) {
        await supabase
          .from('walker_locations')
          .update({ is_default: false })
          .eq('school_id', profile.school_id)
          .neq('id', editingRecord?.id || '');
      }

      if (editingRecord) {
        // Update existing walker location
        const { error } = await supabase
          .from('walker_locations')
          .update({
            location_name: values.location_name,
            is_default: values.is_default,
            status: values.status,
          })
          .eq('id', editingRecord.id);

        if (error) {
          console.error('Error updating walker location:', error);
          toast.error('Failed to update walker location');
          return;
        }

        toast.success('Walker location updated successfully');
        setEditingRecord(null);
      } else {
        // Add new walker location
        const { error } = await supabase
          .from('walker_locations')
          .insert({
            school_id: profile.school_id,
            location_name: values.location_name,
            is_default: values.is_default,
            status: values.status,
          });

        if (error) {
          console.error('Error creating walker location:', error);
          toast.error('Failed to create walker location');
          return;
        }

        toast.success('Walker location created successfully');
        setShowAddDialog(false);
      }
      
      // Refresh the data
      await fetchWalkerLocations();
      form.reset();
    } catch (error) {
      console.error('Error saving walker location:', error);
      toast.error('Failed to save walker location');
    }
  };

  const handleDeleteWalkerLocation = async (walkerLocation: WalkerLocationRecord) => {
    if (!confirm(`Are you sure you want to delete ${walkerLocation.location_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('walker_locations')
        .delete()
        .eq('id', walkerLocation.id);

      if (error) {
        console.error('Error deleting walker location:', error);
        toast.error('Failed to delete walker location');
        return;
      }

      toast.success('Walker location deleted successfully');
      // Refresh the data
      await fetchWalkerLocations();
    } catch (error) {
      console.error('Error deleting walker location:', error);
      toast.error('Failed to delete walker location');
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
            <h1 className="text-2xl font-bold">{schoolName || 'Walker Locations'}</h1>
            <p className="text-sm text-muted-foreground">
              Manage walker pickup locations
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
          <div className="space-y-6">

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Walker Locations Management
                  </CardTitle>
                  <CardDescription>
                    Organize and manage your school's walker pickup locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search walker locations..."
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
                          Add Walker Location
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
                            onClick={() => setSortBy('location_name')}
                          >
                            Location Name
                          </TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentWalkerLocations.map((walkerLocation) => (
                          <TableRow key={walkerLocation.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {walkerLocation.location_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {walkerLocation.is_default && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Default
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(walkerLocation.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingRecord(walkerLocation)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteWalkerLocation(walkerLocation)}
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
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredWalkerLocations.length)} of {filteredWalkerLocations.length} walker locations
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

              {/* Add/Edit Dialog */}
              <Dialog open={showAddDialog || !!editingRecord} onOpenChange={(open) => {
                if (!open) {
                  setShowAddDialog(false);
                  setEditingRecord(null);
                  form.reset();
                }
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecord ? 'Edit Walker Location' : 'Add Walker Location'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRecord 
                        ? 'Update the walker location information below.' 
                        : 'Add a new walker pickup location for your school.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="location_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Main Entrance, Playground Gate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="is_default"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Default Location</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Set this as the default walker pickup location
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active Status</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Location is available for walker pickup
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value === 'active'}
                                onCheckedChange={(checked) => 
                                  field.onChange(checked ? 'active' : 'inactive')
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
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
                          {editingRecord ? 'Update' : 'Create'} Location
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
      </div>
    </>
  );
};

export default WalkerLocations;