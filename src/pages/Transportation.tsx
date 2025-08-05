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
import { Search, Plus, Edit, MoreHorizontal, ChevronDown, Bus, Users, Calendar, BarChart3, UserPlus, Trash2, ArrowLeft } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const editBusSchema = z.object({
  bus_number: z.string().min(1, "Bus number is required"),
  driver_first_name: z.string().min(1, "Driver first name is required"),
  driver_last_name: z.string().min(1, "Driver last name is required"),
  status: z.enum(["active", "inactive", "maintenance"]),
});

interface TransportationRecord {
  id: string;
  bus_number: string;
  driver_first_name: string;
  driver_last_name: string;
  students_count: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

interface StudentSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  class_name: string;
  already_assigned: boolean;
}

interface StudentBusRecord {
  id: string;
  student_id: string;
  student_name: string;
  grade_level: string;
  class_name: string;
  ride_status: 'active_rider' | 'guest_rider' | 'non_rider';
}

const Transportation = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [transportation, setTransportation] = useState<TransportationRecord[]>([]);
  const [filteredTransportation, setFilteredTransportation] = useState<TransportationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof TransportationRecord>('bus_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransportationRecord | null>(null);
  const [managingStudents, setManagingStudents] = useState<TransportationRecord | null>(null);
  const [busStudents, setBusStudents] = useState<StudentBusRecord[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [showCreateStudentForm, setShowCreateStudentForm] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    firstName: '',
    lastName: '',
    gradeLevel: '',
    classId: '',
    studentId: ''
  });
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; class_name: string }>>([]);
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
    fetchTransportation();
    fetchSchoolName();
  }, [user]);

  const fetchTransportation = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: buses, error } = await supabase
        .from('buses')
        .select(`
          *,
          student_bus_assignments(
            student_id
          )
        `);

      if (error) {
        console.error('Error fetching buses:', error);
        toast.error('Failed to load transportation data');
        return;
      }

      const transportationData: TransportationRecord[] = buses?.map(bus => ({
        id: bus.id,
        bus_number: bus.bus_number,
        driver_first_name: bus.driver_first_name,
        driver_last_name: bus.driver_last_name,
        students_count: bus.student_bus_assignments?.length || 0,
        status: bus.status as 'active' | 'inactive' | 'maintenance',
        created_at: bus.created_at,
        updated_at: bus.updated_at,
      })) || [];

      setTransportation(transportationData);
      setFilteredTransportation(transportationData);
    } catch (error) {
      console.error('Error fetching transportation data:', error);
      toast.error('Failed to load transportation data');
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
    let filtered = transportation.filter(record => {
      const driverName = `${record.driver_first_name} ${record.driver_last_name}`;
      const matchesSearch = 
        record.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driverName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      
      // Special handling for driver name
      if (sortBy === 'driver_first_name') {
        aVal = `${a.driver_first_name} ${a.driver_last_name}`;
        bVal = `${b.driver_first_name} ${b.driver_last_name}`;
      }
      
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

  const form = useForm<z.infer<typeof editBusSchema>>({
    resolver: zodResolver(editBusSchema),
    defaultValues: {
      bus_number: "",
      driver_first_name: "",
      driver_last_name: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (editingRecord) {
      form.reset({
        bus_number: editingRecord.bus_number,
        driver_first_name: editingRecord.driver_first_name,
        driver_last_name: editingRecord.driver_last_name,
        status: editingRecord.status,
      });
    } else if (showAddDialog) {
      form.reset({
        bus_number: "",
        driver_first_name: "",
        driver_last_name: "",
        status: "active",
      });
    }
  }, [editingRecord, showAddDialog, form]);

  const handleEditBus = async (values: z.infer<typeof editBusSchema>) => {
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('buses')
        .update({
          bus_number: values.bus_number,
          driver_first_name: values.driver_first_name,
          driver_last_name: values.driver_last_name,
          status: values.status,
        })
        .eq('id', editingRecord.id);

      if (error) {
        console.error('Error updating bus:', error);
        toast.error('Failed to update bus information');
        return;
      }

      toast.success('Bus information updated successfully');
      setEditingRecord(null);
      form.reset();
      fetchTransportation(); // Refresh the data
    } catch (error) {
      console.error('Error updating bus:', error);
      toast.error('Failed to update bus information');
    }
  };

  const handleAddBus = async (values: z.infer<typeof editBusSchema>) => {
    try {
      // Get user's school_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) {
        toast.error('Unable to determine school information');
        return;
      }

      const { error } = await supabase
        .from('buses')
        .insert({
          bus_number: values.bus_number,
          driver_first_name: values.driver_first_name,
          driver_last_name: values.driver_last_name,
          status: values.status,
          school_id: profile.school_id,
        });

      if (error) {
        console.error('Error creating bus:', error);
        toast.error('Failed to create bus');
        return;
      }

      toast.success('Bus created successfully');
      setShowAddDialog(false);
      form.reset();
      fetchTransportation(); // Refresh the data
    } catch (error) {
      console.error('Error creating bus:', error);
      toast.error('Failed to create bus');
    }
  };

  const handleFormSubmit = (values: z.infer<typeof editBusSchema>) => {
    if (editingRecord) {
      handleEditBus(values);
    } else {
      handleAddBus(values);
    }
  };

  const fetchBusStudents = async (busId: string) => {
    setIsLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('student_bus_assignments')
        .select(`
          id,
          student_id,
          students!inner(
            first_name,
            last_name,
            grade_level,
            class_rosters(
              classes(class_name)
            )
          )
        `)
        .eq('bus_id', busId);

      if (error) {
        console.error('Error fetching bus students:', error);
        toast.error('Failed to load students');
        return;
      }

      const studentRecords: StudentBusRecord[] = data?.map(assignment => ({
        id: assignment.id,
        student_id: assignment.student_id,
        student_name: `${assignment.students.first_name} ${assignment.students.last_name}`,
        grade_level: assignment.students.grade_level,
        class_name: assignment.students.class_rosters?.[0]?.classes?.class_name || 'No Class',
        ride_status: 'active_rider', // Default value - this could be stored in the database
      })) || [];

      setBusStudents(studentRecords);
    } catch (error) {
      console.error('Error fetching bus students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleManageStudents = (bus: TransportationRecord) => {
    setManagingStudents(bus);
    fetchBusStudents(bus.id);
  };

  const handleUpdateRideStatus = async (assignmentId: string, newStatus: string) => {
    try {
      // For now, we'll just update the local state since ride_status isn't in the database yet
      setBusStudents(prev => prev.map(student => 
        student.id === assignmentId 
          ? { ...student, ride_status: newStatus as 'active_rider' | 'guest_rider' | 'non_rider' }
          : student
      ));
      toast.success('Ride status updated successfully');
    } catch (error) {
      console.error('Error updating ride status:', error);
      toast.error('Failed to update ride status');
    }
  };

  const handleRemoveStudent = async (assignmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this bus?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('student_bus_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error removing student:', error);
        toast.error('Failed to remove student');
        return;
      }

      setBusStudents(prev => prev.filter(student => student.id !== assignmentId));
      toast.success('Student removed from bus successfully');
      fetchTransportation(); // Refresh the main data to update student counts
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    }
  };

  const searchStudents = async (searchTerm: string) => {
    if (!searchTerm.trim() || !managingStudents) return;
    
    setIsSearchingStudents(true);
    try {
      // Get current user's school_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) return;

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade_level,
          class_rosters(
            classes(class_name)
          ),
          student_bus_assignments(bus_id)
        `)
        .eq('school_id', profile.school_id)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching students:', error);
        return;
      }

      const searchResults: StudentSearchResult[] = data?.map(student => ({
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        grade_level: student.grade_level,
        class_name: student.class_rosters?.[0]?.classes?.class_name || 'No Class',
        already_assigned: student.student_bus_assignments?.some(
          (assignment: any) => assignment.bus_id === managingStudents.id
        ) || false
      })) || [];

      setStudentSearchResults(searchResults);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleAssignStudent = async (studentId: string, rideStatus: string) => {
    if (!managingStudents) return;

    try {
      const { error } = await supabase
        .from('student_bus_assignments')
        .insert({
          student_id: studentId,
          bus_id: managingStudents.id
        });

      if (error) {
        console.error('Error assigning student:', error);
        toast.error('Failed to assign student to bus');
        return;
      }

      toast.success('Student assigned to bus successfully');
      fetchBusStudents(managingStudents.id);
      fetchTransportation(); // Refresh to update student counts
      setStudentSearchTerm('');
      setStudentSearchResults([]);
    } catch (error) {
      console.error('Error assigning student:', error);
      toast.error('Failed to assign student to bus');
    }
  };

  const fetchClasses = async (gradeLevel: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) return;

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', profile.school_id)
        .eq('grade_level', gradeLevel);
      
      if (!error && data) {
        setAvailableClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCreateStudent = async () => {
    if (!managingStudents || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        toast.error('Unable to determine school information');
        return;
      }

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          first_name: newStudentData.firstName,
          last_name: newStudentData.lastName,
          grade_level: newStudentData.gradeLevel,
          student_id: newStudentData.studentId || null,
          school_id: profile.school_id
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // If a class is selected, add the student to the class roster
      if (newStudentData.classId && studentData) {
        const { error: rosterError } = await supabase
          .from('class_rosters')
          .insert({
            student_id: studentData.id,
            class_id: newStudentData.classId
          });

        if (rosterError) throw rosterError;
      }

      // Assign student to the bus
      const { error: assignmentError } = await supabase
        .from('student_bus_assignments')
        .insert({
          student_id: studentData.id,
          bus_id: managingStudents.id
        });

      if (assignmentError) throw assignmentError;

      toast.success('Student created and assigned to bus successfully');
      
      // Reset form
      setNewStudentData({
        firstName: '',
        lastName: '',
        gradeLevel: '',
        classId: '',
        studentId: ''
      });
      setShowCreateStudentForm(false);
      setShowAddStudentDialog(false);
      
      fetchBusStudents(managingStudents.id);
      fetchTransportation();
    } catch (error) {
      console.error('Error creating student:', error);
      toast.error('Failed to create student');
    }
  };

  // Fetch classes when grade level changes
  useEffect(() => {
    if (newStudentData.gradeLevel) {
      fetchClasses(newStudentData.gradeLevel);
    } else {
      setAvailableClasses([]);
    }
  }, [newStudentData.gradeLevel, user]);

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
                <h1 className="text-2xl font-bold">{schoolName || 'Transportation'}</h1>
                <p className="text-sm text-muted-foreground">
                  Manage school buses and student assignments
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
                  <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
                  <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{transportation.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total buses in fleet
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
                    {transportation.reduce((sum, bus) => sum + bus.students_count, 0)}
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
                    {transportation.filter(bus => bus.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently operational
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {transportation.filter(bus => bus.status === 'maintenance').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buses in maintenance
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transportation Management */}
            <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {managingStudents ? `Transportation Management: ${managingStudents.bus_number}` : 'Transportation Management'}
                    </CardTitle>
                    <CardDescription>
                      {managingStudents 
                        ? `Manage students for Bus ${managingStudents.bus_number}`
                        : 'Manage buses, drivers, and student assignments'
                      }
                    </CardDescription>
                  </div>
                  {managingStudents ? (
                    <div className="flex gap-2">
                      <Button onClick={() => setManagingStudents(null)} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Buses
                      </Button>
                      <Button onClick={() => setShowAddStudentDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Student
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bus
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {managingStudents ? (
                  /* Student Management View */
                  <div className="space-y-4">
                    {isLoadingStudents ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <>
                        {/* Students Table */}
                        <div className="rounded-md border bg-background/50">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border hover:bg-muted/50">
                                <TableHead>Student Name</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Ride Status</TableHead>
                                <TableHead className="w-[50px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {busStudents.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No students assigned to this bus yet.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                busStudents.map((student) => (
                                  <TableRow key={student.id} className="border-border hover:bg-muted/30">
                                    <TableCell className="font-medium">{student.student_name}</TableCell>
                                    <TableCell>{student.grade_level}</TableCell>
                                    <TableCell>{student.class_name}</TableCell>
                                    <TableCell>
                                      <Select 
                                        value={student.ride_status} 
                                        onValueChange={(value) => handleUpdateRideStatus(student.id, value)}
                                      >
                                        <SelectTrigger className="w-[140px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active_rider">Active Rider</SelectItem>
                                          <SelectItem value="guest_rider">Guest Rider</SelectItem>
                                          <SelectItem value="non_rider">Non-rider</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleRemoveStudent(student.id, student.student_name)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Bus Management View */
                  <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search buses or drivers..."
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
                              onClick={() => handleSortChange('bus_number', sortBy === 'bus_number' && sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              Bus Number
                              {sortBy === 'bus_number' && (
                                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => handleSortChange('driver_first_name', sortBy === 'driver_first_name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                              Driver
                              {sortBy === 'driver_first_name' && (
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
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentTransportation.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {searchTerm || filterStatus !== 'all' 
                                  ? 'No buses match your search criteria.' 
                                  : 'No buses found. Add your first bus to get started.'
                                }
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentTransportation.map((bus) => (
                              <TableRow key={bus.id} className="border-border hover:bg-muted/30">
                                <TableCell className="font-medium">{bus.bus_number}</TableCell>
                                <TableCell>{bus.driver_first_name} {bus.driver_last_name}</TableCell>
                                <TableCell>{bus.students_count}</TableCell>
                                <TableCell>{getStatusBadge(bus.status)}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                      <DropdownMenuItem onClick={() => setEditingRecord(bus)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleManageStudents(bus)}>
                                        <Users className="h-4 w-4 mr-2" />
                                        Manage Students
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
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredTransportation.length)} of {filteredTransportation.length} buses
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
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Add/Edit Bus Dialog */}
        <Dialog open={showAddDialog || !!editingRecord} onOpenChange={() => {
          setShowAddDialog(false);
          setEditingRecord(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Bus Information' : 'Add New Bus'}</DialogTitle>
              <DialogDescription>
                {editingRecord 
                  ? 'Update the bus details below. Click save when you\'re done.'
                  : 'Enter the new bus details below. Click save to add the bus.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bus_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bus Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bus number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driver_first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="driver_last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    setEditingRecord(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Save Changes' : 'Add Bus'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add Student Dialog */}
        <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Student to Bus {managingStudents?.bus_number}</DialogTitle>
              <DialogDescription>
                Search for existing students or create a new student record.
              </DialogDescription>
            </DialogHeader>
            
            {!showCreateStudentForm ? (
              <div className="space-y-4">
                {/* Student Search */}
                <div className="space-y-2">
                  <Label>Search Students</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter student name..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        if (e.target.value.length >= 2) {
                          searchStudents(e.target.value);
                        } else {
                          setStudentSearchResults([]);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateStudentForm(true)}
                    >
                      Create New
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {isSearchingStudents && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}

                {studentSearchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Search Results</Label>
                    <div className="border rounded-md">
                      {studentSearchResults.map((student) => (
                        <div key={student.id} className="p-3 border-b last:border-b-0 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Grade {student.grade_level} • {student.class_name}
                            </p>
                          </div>
                          {student.already_assigned ? (
                            <Badge variant="secondary">Already on this bus</Badge>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Select onValueChange={(value) => handleAssignStudent(student.id, value)}>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Ride Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active_rider">Active Rider</SelectItem>
                                  <SelectItem value="guest_rider">Guest Rider</SelectItem>
                                  <SelectItem value="non_rider">Non-rider</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentSearchTerm.length >= 2 && !isSearchingStudents && studentSearchResults.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No students found. <Button variant="link" onClick={() => setShowCreateStudentForm(true)} className="p-0 h-auto">Create a new student record</Button>
                  </div>
                )}
              </div>
            ) : (
              /* Create Student Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Create New Student</Label>
                  <Button variant="outline" onClick={() => setShowCreateStudentForm(false)}>
                    Back to Search
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={newStudentData.firstName}
                      onChange={(e) => setNewStudentData({ ...newStudentData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={newStudentData.lastName}
                      onChange={(e) => setNewStudentData({ ...newStudentData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Grade Level *</Label>
                  <Select value={newStudentData.gradeLevel} onValueChange={(value) => setNewStudentData({ ...newStudentData, gradeLevel: value, classId: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6th Grade</SelectItem>
                      <SelectItem value="7">7th Grade</SelectItem>
                      <SelectItem value="8">8th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStudentData.gradeLevel && availableClasses.length > 0 && (
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={newStudentData.classId} onValueChange={(value) => setNewStudentData({ ...newStudentData, classId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id}>
                            {classItem.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input
                    value={newStudentData.studentId}
                    onChange={(e) => setNewStudentData({ ...newStudentData, studentId: e.target.value })}
                    placeholder="Optional student ID"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowCreateStudentForm(false);
                    setShowAddStudentDialog(false);
                    setNewStudentData({ firstName: '', lastName: '', gradeLevel: '', classId: '', studentId: '' });
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateStudent}
                    disabled={!newStudentData.firstName || !newStudentData.lastName || !newStudentData.gradeLevel}
                  >
                    Create & Assign Student
                  </Button>
                </div>
              </div>
            )}

            {!showCreateStudentForm && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowAddStudentDialog(false)}>
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={showAddDialog || !!editingRecord} onOpenChange={() => {
          setShowAddDialog(false);
          setEditingRecord(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Bus Information' : 'Add New Bus'}</DialogTitle>
              <DialogDescription>
                {editingRecord 
                  ? 'Update the bus details below. Click save when you\'re done.'
                  : 'Enter the new bus details below. Click save to add the bus.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bus_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bus Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bus number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driver_first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="driver_last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    setEditingRecord(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Save Changes' : 'Add Bus'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default Transportation;