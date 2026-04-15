import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

import { Bus, PersonStanding, Car, Users, Plus, Search, MoreHorizontal, Edit, UserPlus, Trash2, GraduationCap, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";

const editBusSchema = z.object({
  bus_number: z.string().min(1, "Bus number is required"),
  driver_first_name: z.string().min(1, "Driver first name is required"),
  driver_last_name: z.string().min(1, "Driver last name is required"),
  status: z.enum(["active", "inactive", "maintenance"]),
});

const walkerLocationSchema = z.object({
  location_name: z.string().min(1, "Location name is required"),
  is_default: z.boolean(),
  status: z.enum(["active", "inactive"]),
});

const carLineSchema = z.object({
  line_name: z.string().min(1, "Line name is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  has_lanes: z.boolean(),
  status: z.enum(["active", "inactive"]),
});

const laneSchema = z.object({
  lane_name: z.string().min(1, "Lane name is required"),
  color: z.string().min(1, "Color is required"),
});

const linkActivitySchema = z.object({
  group_id: z.string().min(1, "Group is required"),
  location: z.string().optional(),
  status: z.enum(["active", "inactive"]),
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
  current_transportation_method: 'bus' | 'walker' | 'car_line' | null;
  current_transportation_details: string | null;
  current_assignment_id: string | null;
}

interface StudentBusRecord {
  id: string;
  student_id: string;
  student_name: string;
  grade_level: string;
  class_name: string;
  ride_status: 'active_rider' | 'guest_rider' | 'non_rider';
}

interface WalkerLocationRecord {
  id: string;
  school_id: number;
  location_name: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  students_count: number;
}

interface CarLineRecord {
  id: string;
  school_id: number;
  line_name: string;
  color: string;
  pickup_location: string;
  has_lanes: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  students_count: number;
}

interface CarLineLane {
  id: string;
  car_line_id: string;
  lane_name: string;
  color: string;
  order_index: number;
}

interface ActivityTransportRecord {
  id: string;
  group_id: string;
  group_name: string;
  group_type: string;
  school_id: number;
  location: string | null;
  status: 'active' | 'inactive';
  students_count: number;
  manager_list: string[];
  created_at: string;
  updated_at: string;
}

const Transportation = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const SEO = useSEO();
  const isMobile = useIsMobile();
  const [statsOpen, setStatsOpen] = useState(false);
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
  
  const { schoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();
  
  // Walker locations state
  const [walkerLocations, setWalkerLocations] = useState<WalkerLocationRecord[]>([]);
  const [filteredWalkerLocations, setFilteredWalkerLocations] = useState<WalkerLocationRecord[]>([]);
  const [walkerSearchTerm, setWalkerSearchTerm] = useState('');
  const [walkerCurrentPage, setWalkerCurrentPage] = useState(1);
  const [walkerSortBy, setWalkerSortBy] = useState<keyof WalkerLocationRecord>('location_name');
  const [walkerSortOrder, setWalkerSortOrder] = useState<'asc' | 'desc'>('asc');
  const [walkerFilterStatus, setWalkerFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddWalkerDialog, setShowAddWalkerDialog] = useState(false);
  const [editingWalkerRecord, setEditingWalkerRecord] = useState<WalkerLocationRecord | null>(null);
  
  // Car lines state  
  const [carLines, setCarLines] = useState<CarLineRecord[]>([]);
  const [filteredCarLines, setFilteredCarLines] = useState<CarLineRecord[]>([]);
  const [carSearchTerm, setCarSearchTerm] = useState('');
  const [carCurrentPage, setCarCurrentPage] = useState(1);
  const [carSortBy, setCarSortBy] = useState<keyof CarLineRecord>('line_name');
  const [carSortOrder, setCarSortOrder] = useState<'asc' | 'desc'>('asc');
  const [carFilterStatus, setCarFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddCarDialog, setShowAddCarDialog] = useState(false);
  const [editingCarRecord, setEditingCarRecord] = useState<CarLineRecord | null>(null);
  
  // Lane management state
  const [lanes, setLanes] = useState<CarLineLane[]>([]);
  const [showAddLaneDialog, setShowAddLaneDialog] = useState(false);
  const [editingLane, setEditingLane] = useState<CarLineLane | null>(null);
  
  // Walker location student management state
  const [managingWalkerStudents, setManagingWalkerStudents] = useState<WalkerLocationRecord | null>(null);
  const [walkerStudents, setWalkerStudents] = useState<StudentBusRecord[]>([]);
  const [isLoadingWalkerStudents, setIsLoadingWalkerStudents] = useState(false);
  const [showAddWalkerStudentDialog, setShowAddWalkerStudentDialog] = useState(false);
  const [walkerStudentSearchTerm, setWalkerStudentSearchTerm] = useState('');
  const [walkerStudentSearchResults, setWalkerStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearchingWalkerStudents, setIsSearchingWalkerStudents] = useState(false);
  
  // Car line student management state
  const [managingCarStudents, setManagingCarStudents] = useState<CarLineRecord | null>(null);
  const [carStudents, setCarStudents] = useState<StudentBusRecord[]>([]);
  const [isLoadingCarStudents, setIsLoadingCarStudents] = useState(false);
  const [showAddCarStudentDialog, setShowAddCarStudentDialog] = useState(false);
  const [carStudentSearchTerm, setCarStudentSearchTerm] = useState('');
  const [carStudentSearchResults, setCarStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearchingCarStudents, setIsSearchingCarStudents] = useState(false);
  
  // After school activities state (now group-linked)
  const [afterSchoolActivities, setAfterSchoolActivities] = useState<ActivityTransportRecord[]>([]);
  const [filteredAfterSchoolActivities, setFilteredAfterSchoolActivities] = useState<ActivityTransportRecord[]>([]);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activitySortBy, setActivitySortBy] = useState<keyof ActivityTransportRecord>('group_name');
  const [activitySortOrder, setActivitySortOrder] = useState<'asc' | 'desc'>('asc');
  const [activityFilterStatus, setActivityFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [editingActivityRecord, setEditingActivityRecord] = useState<ActivityTransportRecord | null>(null);
  
  // Available groups for linking
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; group_type: string }>>([]);
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);


  useEffect(() => {
    fetchTransportation();
    fetchWalkerLocations();
    fetchCarLines();
    fetchAfterSchoolActivities();
  }, [schoolId]);

  const fetchTransportation = async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);
      
      // Fetch buses without nested aggregation to avoid RLS issues
      const { data: buses, error: busesError } = await supabase
        .from('buses')
        .select('*')
        .eq('school_id', schoolId)
        .order('bus_number', { ascending: true });

      console.log('Buses query result:', { buses, error: busesError, schoolId });

      if (busesError) {
        console.error('Error fetching buses:', busesError);
        toast.error('Failed to load transportation data');
        return;
      }

      // Fetch bus assignment counts separately
      const busAssignmentCounts = new Map<string, number>();
      if (buses && buses.length > 0) {
        for (const bus of buses) {
          const { count } = await supabase
            .from('student_bus_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('bus_id', bus.id);
          busAssignmentCounts.set(bus.id, count || 0);
        }
      }

      const transportationData: TransportationRecord[] = (buses ?? []).map((bus: any) => ({
        id: bus.id,
        bus_number: bus.bus_number,
        driver_first_name: bus.driver_first_name,
        driver_last_name: bus.driver_last_name,
        students_count: busAssignmentCounts.get(bus.id) || 0,
        status: bus.status as 'active' | 'inactive' | 'maintenance',
        created_at: bus.created_at,
        updated_at: bus.updated_at,
      }));

      setTransportation(transportationData);
      setFilteredTransportation(transportationData);
    } catch (error) {
      console.error('Error fetching transportation data:', error);
      toast.error('Failed to load transportation data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalkerLocations = async () => {
    if (!user || !schoolId) return;

    try {
      // Fetch walker locations without nested aggregation to avoid RLS issues
      const { data: walkerLocationsData, error: walkerError } = await supabase
        .from('walker_locations')
        .select('*')
        .eq('school_id', schoolId)
        .order('location_name');

      if (walkerError) {
        console.error('Error fetching walker locations:', walkerError);
        return;
      }

      // Fetch walker assignment counts separately
      const walkerAssignmentCounts = new Map<string, number>();
      if (walkerLocationsData && walkerLocationsData.length > 0) {
        for (const location of walkerLocationsData) {
          const { count } = await supabase
            .from('student_walker_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('walker_location_id', location.id);
          walkerAssignmentCounts.set(location.id, count || 0);
        }
      }

      const walkerLocationsWithCounts = (walkerLocationsData || []).map(location => ({
        ...location,
        students_count: walkerAssignmentCounts.get(location.id) || 0
      })) as WalkerLocationRecord[];

      setWalkerLocations(walkerLocationsWithCounts);
      setFilteredWalkerLocations(walkerLocationsWithCounts);
    } catch (error) {
      console.error('Error fetching walker locations data:', error);
    }
  };

  const fetchCarLines = async () => {
    if (!user || !schoolId) return;

    try {
      // Fetch car lines without nested aggregation to avoid RLS issues
      const { data: carLinesData, error: carError } = await supabase
        .from('car_lines')
        .select('*')
        .eq('school_id', schoolId)
        .order('line_name');

      if (carError) {
        console.error('Error fetching car lines:', carError);
        return;
      }

      // Fetch car assignment counts separately
      const carAssignmentCounts = new Map<string, number>();
      if (carLinesData && carLinesData.length > 0) {
        for (const carLine of carLinesData) {
          const { count } = await supabase
            .from('student_car_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('car_line_id', carLine.id);
          carAssignmentCounts.set(carLine.id, count || 0);
        }
      }

      const carLinesWithCounts = (carLinesData || []).map(carLine => ({
        ...carLine,
        students_count: carAssignmentCounts.get(carLine.id) || 0
      })) as CarLineRecord[];

      setCarLines(carLinesWithCounts);
      setFilteredCarLines(carLinesWithCounts);
    } catch (error) {
      console.error('Error fetching car lines data:', error);
    }
  };

  const fetchLanes = async (carLineId: string) => {
    try {
      const { data, error } = await supabase
        .from('car_line_lanes')
        .select('*')
        .eq('car_line_id', carLineId)
        .order('order_index');

      if (error) {
        console.error('Error fetching lanes:', error);
        return;
      }

      setLanes(data || []);
    } catch (error) {
      console.error('Error fetching lanes:', error);
    }
  };

  const handleAddLane = async (values: z.infer<typeof laneSchema>) => {
    if (!editingCarRecord) {
      toast.error('Please save the car line first before adding lanes');
      return;
    }

    try {
      const maxOrder = lanes.length > 0 ? Math.max(...lanes.map(l => l.order_index)) : -1;
      
      const { error } = await supabase
        .from('car_line_lanes')
        .insert({
          car_line_id: editingCarRecord.id,
          lane_name: values.lane_name,
          color: values.color,
          order_index: maxOrder + 1,
        });

      if (error) {
        console.error('Error adding lane:', error);
        toast.error('Failed to add lane');
        return;
      }

      toast.success('Lane added successfully');
      await fetchLanes(editingCarRecord.id);
      setShowAddLaneDialog(false);
      laneForm.reset();
    } catch (error) {
      console.error('Error adding lane:', error);
      toast.error('Failed to add lane');
    }
  };

  const handleEditLane = async (values: z.infer<typeof laneSchema>) => {
    if (!editingLane) return;

    try {
      const { error } = await supabase
        .from('car_line_lanes')
        .update({
          lane_name: values.lane_name,
          color: values.color,
        })
        .eq('id', editingLane.id);

      if (error) {
        console.error('Error updating lane:', error);
        toast.error('Failed to update lane');
        return;
      }

      toast.success('Lane updated successfully');
      if (editingCarRecord) {
        await fetchLanes(editingCarRecord.id);
      }
      setEditingLane(null);
      laneForm.reset();
    } catch (error) {
      console.error('Error updating lane:', error);
      toast.error('Failed to update lane');
    }
  };

  const handleDeleteLane = async (lane: CarLineLane) => {
    if (!confirm(`Are you sure you want to delete ${lane.lane_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('car_line_lanes')
        .delete()
        .eq('id', lane.id);

      if (error) {
        console.error('Error deleting lane:', error);
        toast.error('Failed to delete lane');
        return;
      }

      toast.success('Lane deleted successfully');
      if (editingCarRecord) {
        await fetchLanes(editingCarRecord.id);
      }
    } catch (error) {
      console.error('Error deleting lane:', error);
      toast.error('Failed to delete lane');
    }
  };

  const fetchAfterSchoolActivities = async () => {
    if (!user || !schoolId) return;

    try {
      // Fetch activity_transport_options with group details
      const { data: atoData, error: atoError } = await supabase
        .from('activity_transport_options' as any)
        .select('*, special_use_groups(id, name, group_type)')
        .eq('school_id', schoolId);

      if (atoError) {
        console.error('Error fetching activity transport options:', atoError);
        return;
      }

      // Fetch student counts and manager names for each linked group
      const records: ActivityTransportRecord[] = [];
      for (const ato of (atoData as any[] || [])) {
        const group = ato.special_use_groups;
        if (!group) continue;

        // Get student count
        const { count: studentCount } = await supabase
          .from('special_use_group_students')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Get managers
        const { data: managers } = await supabase
          .from('special_use_group_managers')
          .select('manager_id, teachers(first_name, last_name)')
          .eq('group_id', group.id);

        const managerList = (managers || [])
          .map((m: any) => m.teachers ? `${m.teachers.first_name} ${m.teachers.last_name}` : '')
          .filter(Boolean);

        records.push({
          id: ato.id,
          group_id: group.id,
          group_name: group.name,
          group_type: group.group_type || '',
          school_id: ato.school_id,
          location: ato.location,
          status: ato.status as 'active' | 'inactive',
          students_count: studentCount || 0,
          manager_list: managerList,
          created_at: ato.created_at,
          updated_at: ato.updated_at,
        });
      }

      records.sort((a, b) => a.group_name.localeCompare(b.group_name));
      setAfterSchoolActivities(records);
      setFilteredAfterSchoolActivities(records);

      // Also fetch available groups not yet linked
      const linkedGroupIds = records.map(r => r.group_id);
      const { data: allGroups } = await supabase
        .from('special_use_groups')
        .select('id, name, group_type')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      const unlinked = (allGroups || []).filter(g => !linkedGroupIds.includes(g.id));
      setAvailableGroups(unlinked);
    } catch (error) {
      console.error('Error fetching activity transport data:', error);
    }
  };


  // Search and filter logic for buses
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

  // Walker locations search and filter logic
  useEffect(() => {
    let filtered = walkerLocations.filter(record => {
      const matchesSearch = 
        record.location_name.toLowerCase().includes(walkerSearchTerm.toLowerCase());
      
      const matchesStatus = walkerFilterStatus === 'all' || record.status === walkerFilterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[walkerSortBy];
      let bVal: any = b[walkerSortBy];
      
      if (aVal < bVal) return walkerSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return walkerSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredWalkerLocations(filtered);
    setWalkerCurrentPage(1);
  }, [walkerLocations, walkerSearchTerm, walkerFilterStatus, walkerSortBy, walkerSortOrder]);

  // Car lines search and filter logic
  useEffect(() => {
    let filtered = carLines.filter(record => {
      const matchesSearch = 
        record.line_name.toLowerCase().includes(carSearchTerm.toLowerCase()) ||
        record.pickup_location.toLowerCase().includes(carSearchTerm.toLowerCase());
      
      const matchesStatus = carFilterStatus === 'all' || record.status === carFilterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[carSortBy];
      let bVal: any = b[carSortBy];
      
      if (aVal < bVal) return carSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return carSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCarLines(filtered);
    setCarCurrentPage(1);
  }, [carLines, carSearchTerm, carFilterStatus, carSortBy, carSortOrder]);

  // After school activities search and filter logic
  useEffect(() => {
    let filtered = afterSchoolActivities.filter(record => {
      const matchesSearch = 
        record.group_name.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        (record.location && record.location.toLowerCase().includes(activitySearchTerm.toLowerCase())) ||
        record.manager_list.some(n => n.toLowerCase().includes(activitySearchTerm.toLowerCase()));
      
      const matchesStatus = activityFilterStatus === 'all' || record.status === activityFilterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[activitySortBy];
      let bVal: any = b[activitySortBy];
      
      if (aVal < bVal) return activitySortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return activitySortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredAfterSchoolActivities(filtered);
    setActivityCurrentPage(1);
  }, [afterSchoolActivities, activitySearchTerm, activityFilterStatus, activitySortBy, activitySortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransportation.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransportation = filteredTransportation.slice(startIndex, endIndex);

  // Walker pagination
  const walkerTotalPages = Math.ceil(filteredWalkerLocations.length / itemsPerPage);
  const walkerStartIndex = (walkerCurrentPage - 1) * itemsPerPage;
  const walkerEndIndex = walkerStartIndex + itemsPerPage;
  const currentWalkerLocations = filteredWalkerLocations.slice(walkerStartIndex, walkerEndIndex);

  // Car lines pagination
  const carTotalPages = Math.ceil(filteredCarLines.length / itemsPerPage);
  const carStartIndex = (carCurrentPage - 1) * itemsPerPage;
  const carEndIndex = carStartIndex + itemsPerPage;
  const currentCarLines = filteredCarLines.slice(carStartIndex, carEndIndex);

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

  const getWalkerStatusBadge = (status: WalkerLocationRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCarStatusBadge = (status: CarLineRecord['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>;
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

  const walkerForm = useForm<z.infer<typeof walkerLocationSchema>>({
    resolver: zodResolver(walkerLocationSchema),
    defaultValues: {
      location_name: "",
      is_default: false,
      status: "active",
    },
  });

  const carForm = useForm<z.infer<typeof carLineSchema>>({
    resolver: zodResolver(carLineSchema),
    defaultValues: {
      line_name: "",
      pickup_location: "",
      has_lanes: false,
      status: "active",
    },
  });

  const laneForm = useForm<z.infer<typeof laneSchema>>({
    resolver: zodResolver(laneSchema),
    defaultValues: {
      lane_name: "",
      color: "#3B82F6",
    },
  });

  const activityForm = useForm<z.infer<typeof linkActivitySchema>>({
    resolver: zodResolver(linkActivitySchema),
    defaultValues: {
      group_id: "",
      location: "",
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

  useEffect(() => {
    if (editingWalkerRecord) {
      walkerForm.reset({
        location_name: editingWalkerRecord.location_name,
        is_default: editingWalkerRecord.is_default,
        status: editingWalkerRecord.status,
      });
    } else if (showAddWalkerDialog) {
      walkerForm.reset({
        location_name: "",
        is_default: false,
        status: "active",
      });
    }
  }, [editingWalkerRecord, showAddWalkerDialog, walkerForm]);

  useEffect(() => {
    if (editingCarRecord) {
      carForm.reset({
        line_name: editingCarRecord.line_name,
        pickup_location: editingCarRecord.pickup_location,
        has_lanes: editingCarRecord.has_lanes,
        status: editingCarRecord.status,
      });
      // Load lanes if editing and has_lanes is true
      if (editingCarRecord.has_lanes) {
        fetchLanes(editingCarRecord.id);
      }
    } else if (showAddCarDialog) {
      carForm.reset({
        line_name: "",
        pickup_location: "",
        has_lanes: false,
        status: "active",
      });
      setLanes([]);
    }
  }, [editingCarRecord, showAddCarDialog, carForm]);

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
      // Reset filters to ensure the new bus is visible
      setFilterStatus('all');
      setSearchTerm('');
      setSortBy('bus_number');
      setSortOrder('asc');
      setCurrentPage(1);
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

  const handleDeleteBus = async (bus: TransportationRecord) => {
    if (!confirm(`Are you sure you want to delete bus ${bus.bus_number}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', bus.id);

      if (error) {
        console.error('Error deleting bus:', error);
        toast.error('Failed to delete bus');
        return;
      }

      toast.success('Bus deleted successfully');
      await fetchTransportation();
    } catch (error) {
      console.error('Error deleting bus:', error);
      toast.error('Failed to delete bus');
    }
  };

  const handleWalkerFormSubmit = async (values: z.infer<typeof walkerLocationSchema>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) {
        toast.error('No school found for user');
        return;
      }

      if (values.is_default) {
        await supabase
          .from('walker_locations')
          .update({ is_default: false })
          .eq('school_id', profile.school_id)
          .neq('id', editingWalkerRecord?.id || '');
      }

      if (editingWalkerRecord) {
        const { error } = await supabase
          .from('walker_locations')
          .update({
            location_name: values.location_name,
            is_default: values.is_default,
            status: values.status,
          })
          .eq('id', editingWalkerRecord.id);

        if (error) {
          console.error('Error updating walker location:', error);
          toast.error('Failed to update walker location');
          return;
        }

        toast.success('Walker location updated successfully');
        setEditingWalkerRecord(null);
      } else {
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
        setShowAddWalkerDialog(false);
      }
      
      await fetchWalkerLocations();
      walkerForm.reset();
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
      await fetchWalkerLocations();
    } catch (error) {
      console.error('Error deleting walker location:', error);
      toast.error('Failed to delete walker location');
    }
  };

  const handleCarFormSubmit = async (values: z.infer<typeof carLineSchema>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) {
        toast.error('No school found for user');
        return;
      }

      if (editingCarRecord) {
        const { error } = await supabase
          .from('car_lines')
          .update({
            line_name: values.line_name,
            pickup_location: values.pickup_location,
            has_lanes: values.has_lanes,
            status: values.status,
          })
          .eq('id', editingCarRecord.id);

        if (error) {
          console.error('Error updating car line:', error);
          toast.error('Failed to update car line');
          return;
        }

        toast.success('Car line updated successfully');
        setEditingCarRecord(null);
      } else {
        const { data: insertedCarLine, error } = await supabase
          .from('car_lines')
          .insert({
            school_id: profile.school_id,
            line_name: values.line_name,
            color: '#000000', // Default color since field is removed from UI
            pickup_location: values.pickup_location,
            has_lanes: values.has_lanes,
            status: values.status,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating car line:', error);
          toast.error('Failed to create car line');
          return;
        }

        toast.success('Car line created successfully');
        setShowAddCarDialog(false);
        
        // If has_lanes is true, open the edit dialog to add lanes
        if (values.has_lanes && insertedCarLine) {
          await fetchCarLines();
          setEditingCarRecord({ ...insertedCarLine, students_count: 0 } as CarLineRecord);
          return;
        }
      }
      
      await fetchCarLines();
      carForm.reset();
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
      await fetchCarLines();
    } catch (error) {
      console.error('Error deleting car line:', error);
      toast.error('Failed to delete car line');
    }
  };

  const handleActivityFormSubmit = async (values: z.infer<typeof linkActivitySchema>) => {
    try {
      if (editingActivityRecord) {
        // Update existing activity_transport_option (location/status only)
        const { error } = await supabase
          .from('activity_transport_options' as any)
          .update({
            location: values.location || null,
            status: values.status,
          })
          .eq('id', editingActivityRecord.id);

        if (error) throw error;
        toast.success('Activity updated successfully');
        setEditingActivityRecord(null);
      } else {
        // Create new link
        const { error } = await supabase
          .from('activity_transport_options' as any)
          .insert({
            group_id: values.group_id,
            school_id: schoolId,
            location: values.location || null,
            status: values.status,
          });

        if (error) throw error;
        toast.success('Group linked as activity successfully');
      }

      setShowAddActivityDialog(false);
      await fetchAfterSchoolActivities();
      activityForm.reset();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (activity: ActivityTransportRecord) => {
    if (!confirm(`Are you sure you want to unlink ${activity.group_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('activity_transport_options' as any)
        .delete()
        .eq('id', activity.id);

      if (error) {
        console.error('Error unlinking activity:', error);
        toast.error('Failed to unlink activity');
        return;
      }

      toast.success('Activity unlinked successfully');
      await fetchAfterSchoolActivities();
    } catch (error) {
      console.error('Error unlinking activity:', error);
      toast.error('Failed to unlink activity');
    }
  };

  const fetchBusStudents = async (busId: string) => {
    setIsLoadingStudents(true);
    try {
      // Fetch assignments separately to avoid RLS issues with nested queries
      const { data: assignments, error: assignmentError } = await supabase
        .from('student_bus_assignments')
        .select('id, student_id')
        .eq('bus_id', busId);

      if (assignmentError) {
        console.error('Error fetching bus assignments:', assignmentError);
        toast.error('Failed to load students');
        return;
      }

      if (!assignments || assignments.length === 0) {
        setBusStudents([]);
        return;
      }

      // Get student IDs to fetch student details
      const studentIds = assignments.map(a => a.student_id);

      // Fetch student details separately
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade_level,
          class_rosters(
            classes(class_name)
          )
        `)
        .in('id', studentIds);

      if (studentError) {
        console.error('Error fetching student details:', studentError);
        toast.error('Failed to load student details');
        return;
      }

      // Join the data in JavaScript
      const studentRecords: StudentBusRecord[] = assignments.map(assignment => {
        const student = students?.find(s => s.id === assignment.student_id);
        return {
          id: assignment.id,
          student_id: assignment.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
          grade_level: student?.grade_level || 'Unknown',
          class_name: student?.class_rosters?.[0]?.classes?.class_name || 'No Class',
          ride_status: 'active_rider', // Default value - this could be stored in the database
        };
      });

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
          student_bus_assignments(
            id,
            bus_id,
            buses(bus_number, driver_first_name, driver_last_name)
          ),
          student_walker_assignments(
            id,
            walker_location_id,
            walker_locations(location_name)
          ),
          student_car_assignments(
            id,
            car_line_id,
            car_lines(line_name)
          )
        `)
        .eq('school_id', profile.school_id)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching students:', error);
        return;
      }

      const searchResults: StudentSearchResult[] = data?.map(student => {
        // Check current transportation assignments
        let currentMethod: 'bus' | 'walker' | 'car_line' | null = null;
        let currentDetails: string | null = null;
        let currentAssignmentId: string | null = null;

        // Check bus assignment
        if (student.student_bus_assignments?.length > 0) {
          const busAssignment = student.student_bus_assignments[0];
          const bus = busAssignment.buses;
          currentMethod = 'bus';
          currentDetails = `Bus ${bus?.bus_number} (${bus?.driver_first_name} ${bus?.driver_last_name})`;
          currentAssignmentId = busAssignment.id;
        }
        // Check walker assignment
        else if (student.student_walker_assignments?.length > 0) {
          const walkerAssignment = student.student_walker_assignments[0];
          const location = walkerAssignment.walker_locations;
          currentMethod = 'walker';
          currentDetails = `Walker Location: ${location?.location_name}`;
          currentAssignmentId = walkerAssignment.id;
        }
        // Check car line assignment
        else if (student.student_car_assignments?.length > 0) {
          const carAssignment = student.student_car_assignments[0];
          const carLine = carAssignment.car_lines;
          currentMethod = 'car_line';
          currentDetails = `Car Line: ${carLine?.line_name}`;
          currentAssignmentId = carAssignment.id;
        }

        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          grade_level: student.grade_level,
          class_name: student.class_rosters?.[0]?.classes?.class_name || 'No Class',
          current_transportation_method: currentMethod,
          current_transportation_details: currentDetails,
          current_assignment_id: currentAssignmentId
        };
      }) || [];

      setStudentSearchResults(searchResults);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleSwitchStudent = async (
    studentId: string, 
    currentMethod: 'bus' | 'walker' | 'car_line', 
    currentAssignmentId: string,
    newMethod: 'bus' | 'walker' | 'car_line',
    newTransportationId: string
  ) => {
    try {
      // First, remove the existing assignment
      if (currentMethod === 'bus') {
        const { error: deleteError } = await supabase
          .from('student_bus_assignments')
          .delete()
          .eq('id', currentAssignmentId);
        if (deleteError) throw deleteError;
      } else if (currentMethod === 'walker') {
        const { error: deleteError } = await supabase
          .from('student_walker_assignments')
          .delete()
          .eq('id', currentAssignmentId);
        if (deleteError) throw deleteError;
      } else if (currentMethod === 'car_line') {
        const { error: deleteError } = await supabase
          .from('student_car_assignments')
          .delete()
          .eq('id', currentAssignmentId);
        if (deleteError) throw deleteError;
      }

      // Then, add the new assignment
      if (newMethod === 'bus') {
        const { error: insertError } = await supabase
          .from('student_bus_assignments')
          .insert({ student_id: studentId, bus_id: newTransportationId });
        if (insertError) throw insertError;
      } else if (newMethod === 'walker') {
        const { error: insertError } = await supabase
          .from('student_walker_assignments')
          .insert({ student_id: studentId, walker_location_id: newTransportationId });
        if (insertError) throw insertError;
      } else if (newMethod === 'car_line') {
        const { error: insertError } = await supabase
          .from('student_car_assignments')
          .insert({ student_id: studentId, car_line_id: newTransportationId });
        if (insertError) throw insertError;
      }

      toast.success('Student transportation method switched successfully');
      
      // Refresh ALL transportation data to update all student counts
      await Promise.all([
        fetchTransportation(), // Refresh bus data and counts
        fetchWalkerLocations(), // Refresh walker location data and counts
        fetchCarLines() // Refresh car line data and counts
      ]);

      // Refresh the specific student lists if any are currently being managed
      if (managingStudents) {
        fetchBusStudents(managingStudents.id);
      }
      if (managingWalkerStudents) {
        fetchWalkerStudents(managingWalkerStudents.id);
      }
      if (managingCarStudents) {
        fetchCarStudents(managingCarStudents.id);
      }
      
      // Clear search results
      setStudentSearchTerm('');
      setStudentSearchResults([]);
      setWalkerStudentSearchTerm('');
      setWalkerStudentSearchResults([]);
      setCarStudentSearchTerm('');
      setCarStudentSearchResults([]);
    } catch (error) {
      console.error('Error switching student transportation:', error);
      toast.error('Failed to switch student transportation method');
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

  // Walker Location Student Management Functions
  const fetchWalkerStudents = async (walkerLocationId: string) => {
    setIsLoadingWalkerStudents(true);
    try {
      // Fetch assignments separately to avoid RLS issues with nested queries
      const { data: assignments, error: assignmentError } = await supabase
        .from('student_walker_assignments')
        .select('id, student_id, assigned_at')
        .eq('walker_location_id', walkerLocationId);

      if (assignmentError) {
        console.error('Error fetching walker assignments:', assignmentError);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setWalkerStudents([]);
        return;
      }

      // Get student IDs to fetch student details
      const studentIds = assignments.map(a => a.student_id);

      // Fetch student details separately
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade_level,
          class_rosters(
            classes(class_name)
          )
        `)
        .in('id', studentIds);

      if (studentError) {
        console.error('Error fetching student details:', studentError);
        return;
      }

      // Join the data in JavaScript
      const studentRecords = assignments.map(assignment => {
        const student = students?.find(s => s.id === assignment.student_id);
        return {
          student_id: assignment.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
          id: assignment.student_id,
          first_name: student?.first_name || '',
          last_name: student?.last_name || '',
          grade_level: student?.grade_level || '',
          class_name: student?.class_rosters?.[0]?.classes?.class_name || 'No Class',
          assigned_at: assignment.assigned_at,
          assignment_id: assignment.id,
          ride_status: 'active_rider' as const
        };
      });

      setWalkerStudents(studentRecords);
    } catch (error) {
      console.error('Error fetching walker students:', error);
    } finally {
      setIsLoadingWalkerStudents(false);
    }
  };

  const handleManageWalkerStudents = (location: WalkerLocationRecord) => {
    setManagingWalkerStudents(location);
    fetchWalkerStudents(location.id);
  };

  const searchWalkerStudents = async (searchTerm: string) => {
    if (!searchTerm.trim() || !managingWalkerStudents) return;
    
    setIsSearchingWalkerStudents(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) {
        setWalkerStudentSearchResults([]);
        return;
      }

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
          student_bus_assignments(
            id,
            bus_id,
            buses(bus_number, driver_first_name, driver_last_name)
          ),
          student_walker_assignments(
            id,
            walker_location_id,
            walker_locations(location_name)
          ),
          student_car_assignments(
            id,
            car_line_id,
            car_lines(line_name)
          )
        `)
        .eq('school_id', profile.school_id)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching students:', error);
        return;
      }

      const searchResults: StudentSearchResult[] = data?.map(student => {
        // Check current transportation assignments
        let currentMethod: 'bus' | 'walker' | 'car_line' | null = null;
        let currentDetails: string | null = null;
        let currentAssignmentId: string | null = null;

        // Check bus assignment
        if (student.student_bus_assignments?.length > 0) {
          const busAssignment = student.student_bus_assignments[0];
          const bus = busAssignment.buses;
          currentMethod = 'bus';
          currentDetails = `Bus ${bus?.bus_number} (${bus?.driver_first_name} ${bus?.driver_last_name})`;
          currentAssignmentId = busAssignment.id;
        }
        // Check walker assignment
        else if (student.student_walker_assignments?.length > 0) {
          const walkerAssignment = student.student_walker_assignments[0];
          const location = walkerAssignment.walker_locations;
          currentMethod = 'walker';
          currentDetails = `Walker Location: ${location?.location_name}`;
          currentAssignmentId = walkerAssignment.id;
        }
        // Check car line assignment
        else if (student.student_car_assignments?.length > 0) {
          const carAssignment = student.student_car_assignments[0];
          const carLine = carAssignment.car_lines;
          currentMethod = 'car_line';
          currentDetails = `Car Line: ${carLine?.line_name}`;
          currentAssignmentId = carAssignment.id;
        }

        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          grade_level: student.grade_level,
          class_name: student.class_rosters?.[0]?.classes?.class_name || 'No Class',
          current_transportation_method: currentMethod,
          current_transportation_details: currentDetails,
          current_assignment_id: currentAssignmentId
        };
      }) || [];

      setWalkerStudentSearchResults(searchResults);
    } catch (error) {
      console.error('Error searching walker students:', error);
    } finally {
      setIsSearchingWalkerStudents(false);
    }
  };

  const handleAssignWalkerStudent = async (studentId: string) => {
    if (!managingWalkerStudents) return;

    try {
      const { error } = await supabase
        .from('student_walker_assignments')
        .insert({
          student_id: studentId,
          walker_location_id: managingWalkerStudents.id
        });

      if (error) throw error;

      toast.success('Student assigned to walker location successfully');
      fetchWalkerStudents(managingWalkerStudents.id);
      fetchWalkerLocations(); // Refresh to update student counts
      setWalkerStudentSearchTerm('');
      setWalkerStudentSearchResults([]);
    } catch (error) {
      console.error('Error assigning walker student:', error);
      toast.error('Failed to assign student to walker location');
    }
  };

  const handleRemoveWalkerStudent = async (assignmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this walker location?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('student_walker_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Student removed from walker location successfully');
      fetchWalkerStudents(managingWalkerStudents!.id);
      fetchWalkerLocations(); // Refresh to update student counts
    } catch (error) {
      console.error('Error removing walker student:', error);
      toast.error('Failed to remove student from walker location');
    }
  };

  // Car Line Student Management Functions
  const fetchCarStudents = async (carLineId: string) => {
    setIsLoadingCarStudents(true);
    try {
      // Fetch assignments separately to avoid RLS issues with nested queries
      const { data: assignments, error: assignmentError } = await supabase
        .from('student_car_assignments')
        .select('id, student_id, assigned_at')
        .eq('car_line_id', carLineId);

      if (assignmentError) {
        console.error('Error fetching car assignments:', assignmentError);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setCarStudents([]);
        return;
      }

      // Get student IDs to fetch student details
      const studentIds = assignments.map(a => a.student_id);

      // Fetch student details separately
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          grade_level,
          class_rosters(
            classes(class_name)
          )
        `)
        .in('id', studentIds);

      if (studentError) {
        console.error('Error fetching student details:', studentError);
        return;
      }

      // Join the data in JavaScript
      const studentRecords = assignments.map(assignment => {
        const student = students?.find(s => s.id === assignment.student_id);
        return {
          student_id: assignment.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
          id: assignment.student_id,
          first_name: student?.first_name || '',
          last_name: student?.last_name || '',
          grade_level: student?.grade_level || '',
          class_name: student?.class_rosters?.[0]?.classes?.class_name || 'No Class',
          assigned_at: assignment.assigned_at,
          assignment_id: assignment.id,
          ride_status: 'active_rider' as const
        };
      });

      setCarStudents(studentRecords);
    } catch (error) {
      console.error('Error fetching car students:', error);
    } finally {
      setIsLoadingCarStudents(false);
    }
  };

  const handleManageCarStudents = (carLine: CarLineRecord) => {
    setManagingCarStudents(carLine);
    fetchCarStudents(carLine.id);
  };

  const searchCarStudents = async (searchTerm: string) => {
    if (!searchTerm.trim() || !managingCarStudents) return;
    
    setIsSearchingCarStudents(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) {
        setCarStudentSearchResults([]);
        return;
      }

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
          student_bus_assignments(
            id,
            bus_id,
            buses(bus_number, driver_first_name, driver_last_name)
          ),
          student_walker_assignments(
            id,
            walker_location_id,
            walker_locations(location_name)
          ),
          student_car_assignments(
            id,
            car_line_id,
            car_lines(line_name)
          )
        `)
        .eq('school_id', profile.school_id)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching students:', error);
        return;
      }

      const searchResults: StudentSearchResult[] = data?.map(student => {
        // Check current transportation assignments
        let currentMethod: 'bus' | 'walker' | 'car_line' | null = null;
        let currentDetails: string | null = null;
        let currentAssignmentId: string | null = null;

        // Check bus assignment
        if (student.student_bus_assignments?.length > 0) {
          const busAssignment = student.student_bus_assignments[0];
          const bus = busAssignment.buses;
          currentMethod = 'bus';
          currentDetails = `Bus ${bus?.bus_number} (${bus?.driver_first_name} ${bus?.driver_last_name})`;
          currentAssignmentId = busAssignment.id;
        }
        // Check walker assignment
        else if (student.student_walker_assignments?.length > 0) {
          const walkerAssignment = student.student_walker_assignments[0];
          const location = walkerAssignment.walker_locations;
          currentMethod = 'walker';
          currentDetails = `Walker Location: ${location?.location_name}`;
          currentAssignmentId = walkerAssignment.id;
        }
        // Check car line assignment
        else if (student.student_car_assignments?.length > 0) {
          const carAssignment = student.student_car_assignments[0];
          const carLine = carAssignment.car_lines;
          currentMethod = 'car_line';
          currentDetails = `Car Line: ${carLine?.line_name}`;
          currentAssignmentId = carAssignment.id;
        }

        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          grade_level: student.grade_level,
          class_name: student.class_rosters?.[0]?.classes?.class_name || 'No Class',
          current_transportation_method: currentMethod,
          current_transportation_details: currentDetails,
          current_assignment_id: currentAssignmentId
        };
      }) || [];

      setCarStudentSearchResults(searchResults);
    } catch (error) {
      console.error('Error searching car students:', error);
    } finally {
      setIsSearchingCarStudents(false);
    }
  };

  const handleAssignCarStudent = async (studentId: string) => {
    if (!managingCarStudents) return;

    try {
      const { error } = await supabase
        .from('student_car_assignments')
        .insert({
          student_id: studentId,
          car_line_id: managingCarStudents.id
        });

      if (error) throw error;

      toast.success('Student assigned to car line successfully');
      fetchCarStudents(managingCarStudents.id);
      fetchCarLines(); // Refresh to update student counts
      setCarStudentSearchTerm('');
      setCarStudentSearchResults([]);
    } catch (error) {
      console.error('Error assigning car student:', error);
      toast.error('Failed to assign student to car line');
    }
  };

  const handleRemoveCarStudent = async (assignmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this car line?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('student_car_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Student removed from car line successfully');
      fetchCarStudents(managingCarStudents!.id);
      fetchCarLines(); // Refresh to update student counts
    } catch (error) {
      console.error('Error removing car student:', error);
      toast.error('Failed to remove car line');
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

  if (!user) {
    return null;
  }

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 w-full flex">
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 space-y-6">
            {/* Summary Cards */}
            {isMobile ? (
              <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full px-4 py-3 bg-card border rounded-lg hover:bg-accent transition-colors shadow-elevated">
                    <span className="font-semibold text-lg">Stats</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full">
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

                  <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Walker Locations</CardTitle>
                      <PersonStanding className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{walkerLocations.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Total walker pickup locations
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Car Lines</CardTitle>
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{carLines.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Total car pickup lines
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {transportation.filter(bus => bus.status === 'active').reduce((sum, bus) => sum + bus.students_count, 0) +
                         walkerLocations.filter(location => location.status === 'active').reduce((sum, location) => sum + location.students_count, 0) +
                         carLines.filter(line => line.status === 'active').reduce((sum, line) => sum + line.students_count, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total students with transportation
                      </p>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            ) : (
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
                    <CardTitle className="text-sm font-medium">Walker Locations</CardTitle>
                    <PersonStanding className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{walkerLocations.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Total walker pickup locations
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Car Lines</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{carLines.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Total car pickup lines
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {transportation.filter(bus => bus.status === 'active').reduce((sum, bus) => sum + bus.students_count, 0) +
                       walkerLocations.filter(location => location.status === 'active').reduce((sum, location) => sum + location.students_count, 0) +
                       carLines.filter(line => line.status === 'active').reduce((sum, line) => sum + line.students_count, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total students with transportation
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Transportation Management with Tabs */}
            <Tabs defaultValue="buses" className="space-y-0">
              {/* Tabs Container with Connected Design */}
              <div className="bg-card border border-border rounded-lg shadow-elevated overflow-hidden">
                {/* Tab List positioned at top of container */}
                <div className="bg-muted/30 border-b border-border px-6 py-4">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto sm:h-12 p-1 bg-background/80 border border-border/50 rounded-md shadow-sm">
                    <TabsTrigger 
                      value="buses" 
                      className="flex items-center justify-center gap-2 h-10 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-accent/60 hover:text-accent-foreground"
                    >
                      <Bus className="h-4 w-4" />
                      <span className="hidden sm:inline">Buses</span>
                      <span className="sm:hidden">Bus</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="walkers" 
                      className="flex items-center justify-center gap-2 h-10 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-accent/60 hover:text-accent-foreground"
                    >
                      <PersonStanding className="h-4 w-4" />
                      <span className="hidden sm:inline">Walkers</span>
                      <span className="sm:hidden">Walk</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="car-lines" 
                      className="flex items-center justify-center gap-2 h-10 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-accent/60 hover:text-accent-foreground"
                    >
                      <Car className="h-4 w-4" />
                      <span className="hidden sm:inline">Car Lines</span>
                      <span className="sm:hidden">Car</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="activities" 
                      className="flex items-center justify-center gap-2 h-10 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-sm transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-accent/60 hover:text-accent-foreground"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span className="hidden sm:inline">Activities</span>
                      <span className="sm:hidden">Act</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Buses Tab */}
                <TabsContent value="buses" className="m-0 border-0 p-0">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold">Bus Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage buses, drivers, and student assignments
                        </p>
                      </div>
                      <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bus
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {/* Search and Filters */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search buses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                          />
                        </div>
                        <Select 
                          value={filterStatus} 
                          onValueChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive' | 'maintenance')}
                        >
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {filteredTransportation.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((bus) => (
                          <Card key={bus.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base">Bus {bus.bus_number}</CardTitle>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant={bus.status === 'active' ? 'default' : bus.status === 'maintenance' ? 'destructive' : 'secondary'}
                                           className={bus.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                      {bus.status === 'active' ? 'Active' : bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingRecord(bus)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleManageStudents(bus)}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Manage Students
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteBus(bus)} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-muted-foreground">Driver</div>
                                    <div className="font-medium">{`${bus.driver_first_name || ''} ${bus.driver_last_name || ''}`.trim() || "Not assigned"}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Students</div>
                                    <div className="font-medium">{bus.students_count || 0}</div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bus Number</TableHead>
                              <TableHead>Driver</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTransportation.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((bus) => (
                              <TableRow key={bus.id}>
                                <TableCell className="font-medium">{bus.bus_number}</TableCell>
                                <TableCell>{`${bus.driver_first_name || ''} ${bus.driver_last_name || ''}`.trim() || "Not assigned"}</TableCell>
                                <TableCell>
                                  <Badge variant={bus.status === 'active' ? 'default' : bus.status === 'maintenance' ? 'destructive' : 'secondary'}
                                         className={bus.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                    {bus.status === 'active' ? 'Active' : bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{bus.students_count || 0}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setEditingRecord(bus)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleManageStudents(bus)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Manage Students
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteBus(bus)}
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
                    </div>
                  </div>
                </TabsContent>

                {/* Walkers Tab */}
                <TabsContent value="walkers" className="m-0 border-0 p-0">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold">Walker Locations Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Organize and manage your school's walker pickup locations
                        </p>
                      </div>
                      <Button onClick={() => setShowAddWalkerDialog(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Walker Location
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {/* Search and Filters */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search walker locations..."
                            value={walkerSearchTerm}
                            onChange={(e) => setWalkerSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                          />
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                              Status: {walkerFilterStatus === 'all' ? 'All' : walkerFilterStatus}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setWalkerFilterStatus('all')}>
                              All
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setWalkerFilterStatus('active')}>
                              Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setWalkerFilterStatus('inactive')}>
                              Inactive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {filteredWalkerLocations.slice((walkerCurrentPage - 1) * itemsPerPage, walkerCurrentPage * itemsPerPage).map((location) => (
                          <Card key={location.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base">{location.location_name}</CardTitle>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant={location.status === 'active' ? 'default' : 'secondary'} 
                                           className={location.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                      {location.status === 'active' ? 'Active' : location.status.charAt(0).toUpperCase() + location.status.slice(1)}
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingWalkerRecord(location)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleManageWalkerStudents(location)}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Manage Students
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteWalkerLocation(location)} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Students</div>
                                  <div className="font-medium">{location.students_count || 0}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Location Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWalkerLocations.slice((walkerCurrentPage - 1) * itemsPerPage, walkerCurrentPage * itemsPerPage).map((location) => (
                              <TableRow key={location.id}>
                                <TableCell className="font-medium">{location.location_name}</TableCell>
                                <TableCell>
                                  <Badge variant={location.status === 'active' ? 'default' : 'secondary'} 
                                         className={location.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                    {location.status === 'active' ? 'Active' : location.status.charAt(0).toUpperCase() + location.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{location.students_count || 0}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setEditingWalkerRecord(location)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleManageWalkerStudents(location)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Manage Students
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteWalkerLocation(location)}
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
                    </div>
                  </div>
                </TabsContent>

                {/* Car Lines Tab */}
                <TabsContent value="car-lines" className="m-0 border-0 p-0">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold">Car Lines Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Organize and manage your school's car line pickup areas
                        </p>
                      </div>
                      <Button onClick={() => setShowAddCarDialog(true)} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Car Line
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {/* Search and Filters */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search car lines..."
                            value={carSearchTerm}
                            onChange={(e) => setCarSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                          />
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                              Status: {carFilterStatus === 'all' ? 'All' : carFilterStatus}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setCarFilterStatus('all')}>
                              All
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCarFilterStatus('active')}>
                              Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCarFilterStatus('inactive')}>
                              Inactive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {filteredCarLines.slice((carCurrentPage - 1) * itemsPerPage, carCurrentPage * itemsPerPage).map((carLine) => (
                          <Card key={carLine.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base">{carLine.line_name}</CardTitle>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant={carLine.status === 'active' ? 'default' : 'secondary'}
                                           className={carLine.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                      {carLine.status === 'active' ? 'Active' : carLine.status.charAt(0).toUpperCase() + carLine.status.slice(1)}
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingCarRecord(carLine)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleManageCarStudents(carLine)}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Manage Students
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteCarLine(carLine)} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-muted-foreground">Zone</div>
                                    <div className="font-medium">{carLine.pickup_location || "No zone"}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Students</div>
                                    <div className="font-medium">{carLine.students_count || 0}</div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Line Name</TableHead>
                              <TableHead>Zone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCarLines.slice((carCurrentPage - 1) * itemsPerPage, carCurrentPage * itemsPerPage).map((carLine) => (
                              <TableRow key={carLine.id}>
                                <TableCell className="font-medium">{carLine.line_name}</TableCell>
                                <TableCell>{carLine.pickup_location || "No zone"}</TableCell>
                                <TableCell>
                                  <Badge variant={carLine.status === 'active' ? 'default' : 'secondary'}
                                         className={carLine.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                    {carLine.status === 'active' ? 'Active' : carLine.status.charAt(0).toUpperCase() + carLine.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{carLine.students_count || 0}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setEditingCarRecord(carLine)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleManageCarStudents(carLine)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Manage Students
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
                    </div>
                  </div>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities" className="m-0 border-0 p-0">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold">After School Activities</h3>
                        <p className="text-sm text-muted-foreground">
                          Link groups as transportation activities. Manage rosters on the <Link to="/dashboard/groups" className="text-primary underline">Groups page</Link>.
                        </p>
                      </div>
                      <Button onClick={() => { setEditingActivityRecord(null); activityForm.reset(); setShowAddActivityDialog(true); }} className="w-full sm:w-auto" disabled={availableGroups.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Link Group as Activity
                      </Button>
                    </div>

                    {afterSchoolActivities.length === 0 && !isLoading && (
                      <div className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p className="text-lg font-medium mb-2">No activities linked yet</p>
                        <p className="text-sm mb-4">Create a group first, then link it here as a transportation activity.</p>
                        <Button variant="outline" asChild>
                          <Link to="/dashboard/groups">Go to Groups</Link>
                        </Button>
                      </div>
                    )}

                    {afterSchoolActivities.length > 0 && (
                    <div className="space-y-4">
                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {filteredAfterSchoolActivities.map((activity) => (
                          <Card key={activity.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base">{activity.group_name}</CardTitle>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="outline">{activity.group_type.charAt(0).toUpperCase() + activity.group_type.slice(1).replace(/_/g, ' ')}</Badge>
                                    <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                    </Badge>
                                    <Badge variant="secondary">{activity.students_count} students</Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link to="/dashboard/groups">
                                        <Users className="mr-2 h-4 w-4" />
                                        View Group
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setEditingActivityRecord(activity);
                                      activityForm.reset({
                                        group_id: activity.group_id,
                                        location: activity.location || '',
                                        status: activity.status,
                                      });
                                      setShowAddActivityDialog(true);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteActivity(activity)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Unlink
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-muted-foreground">Location</div>
                                    <div className="font-medium">{activity.location || '-'}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Managers</div>
                                    <div className="font-medium">
                                      {activity.manager_list.length > 0 ? (
                                        <HoverCard>
                                          <HoverCardTrigger asChild>
                                            <Badge variant="secondary" className="cursor-pointer">{activity.manager_list.length}</Badge>
                                          </HoverCardTrigger>
                                          <HoverCardContent className="w-auto">
                                            <ul className="text-sm space-y-1">
                                              {activity.manager_list.map((name, i) => <li key={i}>{name}</li>)}
                                            </ul>
                                          </HoverCardContent>
                                        </HoverCard>
                                      ) : '-'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Group Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Managers</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAfterSchoolActivities.map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell className="font-medium">{activity.group_name}</TableCell>
                                <TableCell><Badge variant="outline">{activity.group_type.charAt(0).toUpperCase() + activity.group_type.slice(1).replace(/_/g, ' ')}</Badge></TableCell>
                                <TableCell>{activity.location || '-'}</TableCell>
                                <TableCell>
                                  {activity.manager_list.length > 0 ? (
                                    <HoverCard>
                                      <HoverCardTrigger asChild>
                                        <Badge variant="secondary" className="cursor-pointer">{activity.manager_list.length}</Badge>
                                      </HoverCardTrigger>
                                      <HoverCardContent className="w-auto">
                                        <ul className="text-sm space-y-1">
                                          {activity.manager_list.map((name, i) => <li key={i}>{name}</li>)}
                                        </ul>
                                      </HoverCardContent>
                                    </HoverCard>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{activity.students_count}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                                    {activity.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link to="/dashboard/groups">
                                          <Users className="mr-2 h-4 w-4" />
                                          View Group
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        setEditingActivityRecord(activity);
                                        activityForm.reset({
                                          group_id: activity.group_id,
                                          location: activity.location || '',
                                          status: activity.status,
                                        });
                                        setShowAddActivityDialog(true);
                                      }}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleDeleteActivity(activity)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Unlink
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Add/Edit Bus Dialog */}
      <Dialog open={showAddDialog || !!editingRecord} onOpenChange={() => {
        setShowAddDialog(false);
        setEditingRecord(null);
        form.reset();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Update the bus information below.' : 'Enter the details for the new bus.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bus_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bus Number</FormLabel>
                      <FormControl>
                        <Input placeholder="B-001" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driver_first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingRecord(null);
                  form.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Update Bus' : 'Add Bus'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Walker Location Dialog */}
      <Dialog open={showAddWalkerDialog || !!editingWalkerRecord} onOpenChange={() => {
        setShowAddWalkerDialog(false);
        setEditingWalkerRecord(null);
        walkerForm.reset();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingWalkerRecord ? 'Edit Walker Location' : 'Add New Walker Location'}</DialogTitle>
            <DialogDescription>
              {editingWalkerRecord ? 'Update the walker location information below.' : 'Enter the details for the new walker location.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...walkerForm}>
            <form onSubmit={walkerForm.handleSubmit(handleWalkerFormSubmit)} className="space-y-4">
              <FormField
                control={walkerForm.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Front Door Pickup" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={walkerForm.control}
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
                control={walkerForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddWalkerDialog(false);
                  setEditingWalkerRecord(null);
                  walkerForm.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingWalkerRecord ? 'Update Location' : 'Add Location'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Car Line Dialog */}
      <Dialog open={showAddCarDialog || !!editingCarRecord} onOpenChange={() => {
        setShowAddCarDialog(false);
        setEditingCarRecord(null);
        carForm.reset();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingCarRecord ? 'Edit Car Line' : 'Add New Car Line'}</DialogTitle>
            <DialogDescription>
              {editingCarRecord ? 'Update the car line information below.' : 'Enter the details for the new car line.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...carForm}>
            <form onSubmit={carForm.handleSubmit(handleCarFormSubmit)} className="space-y-4">
              <FormField
                control={carForm.control}
                name="line_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Primary Line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={carForm.control}
                name="pickup_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Main entrance car line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={carForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={carForm.control}
                name="has_lanes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Multiple Lanes
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable if this location has multiple pickup lanes
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
              
              {/* Lane Management Section - Only show when editing and has_lanes is true */}
              {editingCarRecord && carForm.watch('has_lanes') && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Lanes</h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setShowAddLaneDialog(true);
                        laneForm.reset({ lane_name: "", color: "#3B82F6" });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Lane
                    </Button>
                  </div>
                  
                  {lanes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No lanes added yet. Click "Add Lane" to create lanes for this location.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lanes.map((lane) => (
                        <div key={lane.id} className="flex items-center justify-between p-3 rounded-md border bg-background">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: lane.color }}
                            />
                            <span className="font-medium">{lane.lane_name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingLane(lane);
                                laneForm.reset({
                                  lane_name: lane.lane_name,
                                  color: lane.color,
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLane(lane)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {!editingCarRecord && carForm.watch('has_lanes') && (
                <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  After creating this car line, you'll be able to add and manage lanes.
                </p>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddCarDialog(false);
                  setEditingCarRecord(null);
                  carForm.reset();
                  setLanes([]);
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCarRecord ? 'Update Car Line' : 'Add Car Line'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lane Dialog */}
      <Dialog open={showAddLaneDialog || !!editingLane} onOpenChange={() => {
        setShowAddLaneDialog(false);
        setEditingLane(null);
        laneForm.reset();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingLane ? 'Edit Lane' : 'Add New Lane'}</DialogTitle>
            <DialogDescription>
              {editingLane ? 'Update the lane information below.' : 'Enter the details for the new lane.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...laneForm}>
            <form onSubmit={laneForm.handleSubmit(editingLane ? handleEditLane : handleAddLane)} className="space-y-4">
              <FormField
                control={laneForm.control}
                name="lane_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lane Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Lane A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={laneForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lane Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input type="color" {...field} className="w-20 h-10" />
                        <span className="text-sm text-muted-foreground">{field.value}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddLaneDialog(false);
                  setEditingLane(null);
                  laneForm.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingLane ? 'Update Lane' : 'Add Lane'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Walker Students Dialog */}
      <Dialog open={!!managingWalkerStudents} onOpenChange={() => {
        setManagingWalkerStudents(null);
        setWalkerStudents([]);
        setWalkerStudentSearchTerm('');
        setWalkerStudentSearchResults([]);
        setShowAddWalkerStudentDialog(false);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - {managingWalkerStudents?.location_name}</DialogTitle>
            <DialogDescription>
              Add or remove students assigned to this walker location.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Current Students ({walkerStudents.length})</h4>
                <Button 
                  onClick={() => setShowAddWalkerStudentDialog(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </div>
              
              {isLoadingWalkerStudents ? (
                <div className="text-center py-4">Loading students...</div>
              ) : walkerStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No students assigned to this walker location yet.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walkerStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.student_name}</TableCell>
                          <TableCell>{student.grade_level}</TableCell>
                          <TableCell>{student.class_name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveWalkerStudent(student.id, student.student_name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Walker Student Dialog */}
      <Dialog open={showAddWalkerStudentDialog} onOpenChange={setShowAddWalkerStudentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Student to Walker Location</DialogTitle>
            <DialogDescription>
              Search for students to assign to {managingWalkerStudents?.location_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="walker-student-search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="walker-student-search"
                  placeholder="Search by name..."
                  value={walkerStudentSearchTerm}
                  onChange={(e) => {
                    setWalkerStudentSearchTerm(e.target.value);
                    if (e.target.value.length >= 2) {
                      searchWalkerStudents(e.target.value);
                    } else {
                      setWalkerStudentSearchResults([]);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearchingWalkerStudents ? (
              <div className="text-center py-4">Searching...</div>
            ) : walkerStudentSearchResults.length > 0 ? (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walkerStudentSearchResults.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.grade_level}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell className="text-right">
                          {student.current_transportation_method ? (
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs">
                                {student.current_transportation_details}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSwitchStudent(
                                  student.id,
                                  student.current_transportation_method!,
                                  student.current_assignment_id!,
                                  'walker',
                                  managingWalkerStudents!.id
                                )}
                              >
                                Switch
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignWalkerStudent(student.id)}
                            >
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : walkerStudentSearchTerm.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found matching your search.
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddWalkerStudentDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Car Students Dialog */}
      <Dialog open={!!managingCarStudents} onOpenChange={() => {
        setManagingCarStudents(null);
        setCarStudents([]);
        setCarStudentSearchTerm('');
        setCarStudentSearchResults([]);
        setShowAddCarStudentDialog(false);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - {managingCarStudents?.line_name}</DialogTitle>
            <DialogDescription>
              Add or remove students assigned to this car line.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Current Students ({carStudents.length})</h4>
                <Button 
                  onClick={() => setShowAddCarStudentDialog(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </div>
              
              {isLoadingCarStudents ? (
                <div className="text-center py-4">Loading students...</div>
              ) : carStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No students assigned to this car line yet.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.student_name}</TableCell>
                          <TableCell>{student.grade_level}</TableCell>
                          <TableCell>{student.class_name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveCarStudent(student.id, student.student_name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Car Student Dialog */}
      <Dialog open={showAddCarStudentDialog} onOpenChange={setShowAddCarStudentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Student to Car Line</DialogTitle>
            <DialogDescription>
              Search for students to assign to {managingCarStudents?.line_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="car-student-search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="car-student-search"
                  placeholder="Search by name..."
                  value={carStudentSearchTerm}
                  onChange={(e) => {
                    setCarStudentSearchTerm(e.target.value);
                    if (e.target.value.length >= 2) {
                      searchCarStudents(e.target.value);
                    } else {
                      setCarStudentSearchResults([]);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearchingCarStudents ? (
              <div className="text-center py-4">Searching...</div>
            ) : carStudentSearchResults.length > 0 ? (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carStudentSearchResults.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.grade_level}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell className="text-right">
                          {student.current_transportation_method ? (
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs">
                                {student.current_transportation_details}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSwitchStudent(
                                  student.id,
                                  student.current_transportation_method!,
                                  student.current_assignment_id!,
                                  'car_line',
                                  managingCarStudents!.id
                                )}
                              >
                                Switch
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignCarStudent(student.id)}
                            >
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : carStudentSearchTerm.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found matching your search.
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddCarStudentDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={!!managingStudents} onOpenChange={() => {
        setManagingStudents(null);
        setBusStudents([]);
        setStudentSearchTerm('');
        setStudentSearchResults([]);
        setShowAddStudentDialog(false);
        setShowCreateStudentForm(false);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - Bus {managingStudents?.bus_number}</DialogTitle>
            <DialogDescription>
              Add or remove students assigned to this bus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Students */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Current Students ({busStudents.length})</h4>
                <Button 
                  onClick={() => setShowAddStudentDialog(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </div>
              
              {isLoadingStudents ? (
                <div className="text-center py-4">Loading students...</div>
              ) : busStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No students assigned to this bus yet.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {busStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.student_name}</TableCell>
                          <TableCell>{student.grade_level}</TableCell>
                          <TableCell>{student.class_name}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveStudent(student.id, student.student_name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Student to Bus</DialogTitle>
            <DialogDescription>
              Search for students to assign to Bus {managingStudents?.bus_number}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Students */}
            <div>
              <Label htmlFor="student-search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="student-search"
                  placeholder="Search by name..."
                  value={studentSearchTerm}
                  onChange={(e) => {
                    setStudentSearchTerm(e.target.value);
                    if (e.target.value.length >= 2) {
                      searchStudents(e.target.value);
                    } else {
                      setStudentSearchResults([]);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {isSearchingStudents ? (
              <div className="text-center py-4">Searching...</div>
            ) : studentSearchResults.length > 0 ? (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSearchResults.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.grade_level}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell className="text-right">
                          {student.current_transportation_method ? (
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs">
                                {student.current_transportation_details}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSwitchStudent(
                                  student.id,
                                  student.current_transportation_method!,
                                  student.current_assignment_id!,
                                  'bus',
                                  managingStudents!.id
                                )}
                              >
                                Switch
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignStudent(student.id, 'active_rider')}
                            >
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : studentSearchTerm.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found matching your search.
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddStudentDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Link/Edit Activity Dialog */}
      <Dialog open={showAddActivityDialog || !!editingActivityRecord} onOpenChange={() => {
        setShowAddActivityDialog(false);
        setEditingActivityRecord(null);
        activityForm.reset();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingActivityRecord ? 'Edit Activity' : 'Link Group as Activity'}</DialogTitle>
            <DialogDescription>
              {editingActivityRecord ? 'Update the location and status.' : 'Select a group to link as a transportation activity.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(handleActivityFormSubmit)} className="space-y-4">
              {editingActivityRecord && (
                <div className="text-sm text-muted-foreground mb-2">
                  Group: <span className="font-medium text-foreground">{editingActivityRecord.group_name}</span>{' '}
                  <Badge variant="outline" className="ml-1">{editingActivityRecord.group_type.charAt(0).toUpperCase() + editingActivityRecord.group_type.slice(1).replace(/_/g, ' ')}</Badge>
                </div>
              )}
              {!editingActivityRecord && (
                <FormField
                  control={activityForm.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name} ({g.group_type.charAt(0).toUpperCase() + g.group_type.slice(1).replace(/_/g, ' ')})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={activityForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Back Gym, Field #2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={activityForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between pt-4">
                {editingActivityRecord ? (
                  <Button type="button" variant="destructive" onClick={() => {
                    handleDeleteActivity(editingActivityRecord);
                    setShowAddActivityDialog(false);
                    setEditingActivityRecord(null);
                    activityForm.reset();
                  }}>
                    Unlink Group
                  </Button>
                ) : <div />}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddActivityDialog(false);
                    setEditingActivityRecord(null);
                    activityForm.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingActivityRecord ? 'Update' : 'Link Activity'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Transportation;
