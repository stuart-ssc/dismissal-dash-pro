import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowLeft, Bus, Users, MapPin, Car, Clock, Edit, Trash2, Check, ChevronsUpDown, X, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DismissalPlan {
  id: string;
  name: string;
  description?: string;
  dismissal_time?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
}

interface DismissalGroup {
  id: string;
  name: string;
  group_type: 'bus' | 'class' | 'walker' | 'car' | 'activity';
  release_offset_minutes?: number;
  walker_location_id?: string;
  car_rider_capacity?: number;
  car_rider_type?: 'count' | 'all_remaining';
  walker_locations?: { location_name: string };
  dismissal_group_buses?: { buses: { bus_number: string; student_bus_assignments?: { student_id: string }[] } }[];
  dismissal_group_classes?: { classes: { class_name: string; class_rosters?: { student_id: string }[] } }[];
  dismissal_group_students?: { students: { first_name: string; last_name: string } }[];
  dismissal_group_car_lines?: any; // Make flexible to handle potential errors
  dismissal_group_activities?: { after_school_activities: { activity_name: string; student_after_school_assignments?: { student_id: string }[] } }[] | any;
}

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  group_type: z.enum(['bus', 'class', 'walker', 'car', 'activity']),
  release_offset_minutes: z.number().min(0, "Release offset must be 0 or greater").max(180, "Release offset cannot exceed 180 minutes"),
  walker_location_id: z.string().optional(),
  bus_ids: z.array(z.string()).optional(),
  car_line_ids: z.array(z.string()).optional(),
  class_ids: z.array(z.string()).optional(),
  activity_ids: z.array(z.string()).optional(),
  car_rider_type: z.enum(['count', 'all_remaining']).optional(),
  car_rider_capacity: z.number().int().min(1).max(999).optional(),
}).refine((data) => {
  if (data.group_type === 'car' && data.car_rider_type === 'count') {
    return data.car_rider_capacity && data.car_rider_capacity > 0;
  }
  return true;
}, {
  message: "Car rider capacity is required when using count type",
  path: ["car_rider_capacity"],
});

type GroupFormData = z.infer<typeof groupFormSchema>;

export default function DismissalGroups() {
  const { planId } = useParams<{ planId: string }>();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [plan, setPlan] = useState<DismissalPlan | null>(null);
  const [groups, setGroups] = useState<DismissalGroup[]>([]);
  const [buses, setBuses] = useState<{ id: string; bus_number: string }[]>([]);
  const [carLines, setCarLines] = useState<{ id: string; line_name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; class_name: string; grade_level?: string }[]>([]);
  const [walkerLocations, setWalkerLocations] = useState<{ id: string; location_name: string }[]>([]);
  const [availableActivities, setAvailableActivities] = useState<{ id: string; activity_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DismissalGroup | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL_GRADES");
  const [schoolName, setSchoolName] = useState<string>("");
  const [academicSessions, setAcademicSessions] = useState<{ id: string; session_name: string; is_active: boolean }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const { schoolId: activeSchoolId, isLoading: isLoadingSchoolId } = useActiveSchoolId();

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      group_type: 'bus',
      release_offset_minutes: 0,
      walker_location_id: "",
      bus_ids: [],
      car_line_ids: [],
      class_ids: [],
      activity_ids: [],
      car_rider_type: 'all_remaining',
      car_rider_capacity: undefined,
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (userRole !== 'school_admin' && userRole !== 'district_admin') {
      navigate('/dashboard');
      return;
    }

    if (planId) {
      fetchAcademicSessions();
      fetchWalkerLocations();
      fetchBuses();
      fetchCarLines();
      fetchSchoolName();
    }
  }, [user, userRole, planId, navigate, activeSchoolId, isLoadingSchoolId]);

  // Fetch plan and groups when session changes
  useEffect(() => {
    if (planId && selectedSessionId !== null) {
      fetchPlanAndGroups();
      fetchClasses();
      fetchActivities();
    }
  }, [planId, selectedSessionId]);

  const fetchAcademicSessions = async () => {
    if (!activeSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, session_name, is_active')
        .eq('school_id', activeSchoolId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      setAcademicSessions(data || []);
      
      // Pre-select active session
      const activeSession = data?.find(s => s.is_active);
      if (activeSession) {
        setSelectedSessionId(activeSession.id);
      } else if (data && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching academic sessions:', error);
    }
  };

  const fetchPlanAndGroups = async () => {
    if (!planId || !user || selectedSessionId === null) return;

    try {
      setLoading(true);

      // Fetch plan details
      const { data: planData, error: planError } = await supabase
        .from('dismissal_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;
      setPlan({ ...planData, status: planData.status as 'active' | 'inactive' });

      // Fetch basic groups first
      const { data: groupsData, error: groupsError } = await supabase
        .from('dismissal_groups')
        .select(`
          *,
          walker_locations(location_name)
        `)
        .eq('dismissal_plan_id', planId);

      if (groupsError) throw groupsError;

      if (!groupsData || groupsData.length === 0) {
        setGroups([]);
        return;
      }

      // Enrich groups with related data
      const enrichedGroups = await Promise.all(
        groupsData.map(async (group) => {
          const enrichedGroup = {
            ...group,
            group_type: group.group_type as 'bus' | 'class' | 'walker' | 'car' | 'activity',
            car_rider_type: group.car_rider_type as 'count' | 'all_remaining' | undefined,
            dismissal_group_buses: [],
            dismissal_group_classes: [],
            dismissal_group_students: [],
            dismissal_group_car_lines: [],
            dismissal_group_activities: []
          };

          try {
            // Fetch bus assignments
            if (group.group_type === 'bus') {
              const { data: busData } = await supabase
                .from('dismissal_group_buses')
                .select(`
                  buses(bus_number, student_bus_assignments(student_id))
                `)
                .eq('dismissal_group_id', group.id);
              
              enrichedGroup.dismissal_group_buses = busData || [];
            }

            // Fetch class assignments with session filtering
            if (group.group_type === 'class') {
              const { data: classData } = await supabase
                .from('dismissal_group_classes')
                .select(`
                  classes!inner(
                    class_name, 
                    academic_session_id,
                    class_rosters!inner(
                      student_id,
                      students!inner(academic_session_id)
                    )
                  )
                `)
                .eq('dismissal_group_id', group.id)
                .eq('classes.academic_session_id', selectedSessionId);
              
              // Filter roster by session
              const filteredClassData = (classData || []).map(item => ({
                ...item,
                classes: item.classes ? {
                  ...item.classes,
                  class_rosters: (item.classes.class_rosters || []).filter((roster: any) => 
                    roster.students?.academic_session_id === selectedSessionId
                  )
                } : null
              }));
              
              enrichedGroup.dismissal_group_classes = filteredClassData;
            }

            // Fetch car line assignments
            if (group.group_type === 'car') {
              const { data: carLineData } = await supabase
                .from('dismissal_group_car_lines')
                .select(`
                  car_lines(line_name)
                `)
                .eq('dismissal_group_id', group.id);
              
              enrichedGroup.dismissal_group_car_lines = carLineData || [];
            }

            // Fetch activity assignments
            if (group.group_type === 'activity') {
              const { data: activityData } = await supabase
                .from('dismissal_group_activities')
                .select(`
                  after_school_activities(activity_name, student_after_school_assignments(student_id))
                `)
                .eq('dismissal_group_id', group.id);
              
              enrichedGroup.dismissal_group_activities = activityData || [];
            }

            // Fetch direct student assignments
            const { data: studentData } = await supabase
              .from('dismissal_group_students')
              .select(`
                students(first_name, last_name)
              `)
              .eq('dismissal_group_id', group.id);
            
            enrichedGroup.dismissal_group_students = studentData || [];

          } catch (enrichError) {
            console.error(`Error enriching group ${group.id}:`, enrichError);
            // Continue with basic group data if enrichment fails
          }

          return enrichedGroup;
        })
      );

      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Error fetching plan and groups:', error);
      toast({
        title: "Error",
        description: "Failed to load dismissal plan and groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWalkerLocations = async () => {
    if (!activeSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('walker_locations')
        .select('id, location_name')
        .eq('school_id', activeSchoolId)
        .eq('status', 'active');

      if (error) throw error;
      setWalkerLocations(data || []);
    } catch (error) {
      console.error('Error fetching walker locations:', error);
    }
  };

  const fetchBuses = async () => {
    if (!activeSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number')
        .eq('school_id', activeSchoolId)
        .eq('status', 'active')
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchCarLines = async () => {
    if (!activeSchoolId) return;

    try {
      const { data, error } = await supabase
        .from('car_lines')
        .select('id, line_name')
        .eq('school_id', activeSchoolId)
        .eq('status', 'active')
        .order('line_name');

      if (error) throw error;
      setCarLines(data || []);
    } catch (error) {
      console.error('Error fetching car lines:', error);
    }
  };

  const fetchClasses = async () => {
    if (!activeSchoolId || selectedSessionId === null) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, grade_level')
        .eq('school_id', activeSchoolId)
        .eq('academic_session_id', selectedSessionId)
        .order('grade_level, class_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSchoolName = async () => {
    if (!activeSchoolId) return;
    try {
      const { data: school, error } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', activeSchoolId)
        .single();

      if (error) throw error;
      setSchoolName(school?.school_name || '');
    } catch (error) {
      console.error('Error fetching school name:', error);
    }
  };

  const fetchActivities = async () => {
    if (!activeSchoolId || selectedSessionId === null) return;

    try {
      // Activities themselves aren't session-specific, but we still filter for consistency
      const { data, error } = await supabase
        .from('after_school_activities')
        .select('id, activity_name')
        .eq('school_id', activeSchoolId)
        .eq('status', 'active')
        .order('activity_name');

      if (error) throw error;
      setAvailableActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const onSubmit = async (data: GroupFormData) => {
    if (!planId) return;

    try {
        const groupData = {
          name: data.name,
          group_type: data.group_type,
          release_offset_minutes: data.release_offset_minutes,
          dismissal_plan_id: planId,
          walker_location_id: data.group_type === 'walker' ? data.walker_location_id : null,
          car_rider_type: data.group_type === 'car' ? data.car_rider_type : null,
          car_rider_capacity: data.group_type === 'car' && data.car_rider_type === 'count' ? data.car_rider_capacity : null,
        };

      let groupId: string;

      if (editingGroup) {
        const { error } = await supabase
          .from('dismissal_groups')
          .update(groupData)
          .eq('id', editingGroup.id);

        if (error) throw error;
        groupId = editingGroup.id;

        // Clear existing assignments if editing
        if (data.group_type === 'bus') {
          await supabase
            .from('dismissal_group_buses')
            .delete()
            .eq('dismissal_group_id', editingGroup.id);
        }
        if (data.group_type === 'car') {
          await supabase
            .from('dismissal_group_car_lines')
            .delete()
            .eq('dismissal_group_id', editingGroup.id);
        }
        if (data.group_type === 'class') {
          await supabase
            .from('dismissal_group_classes')
            .delete()
            .eq('dismissal_group_id', editingGroup.id);
        }
        if (data.group_type === 'activity') {
          await supabase
            .from('dismissal_group_activities')
            .delete()
            .eq('dismissal_group_id', editingGroup.id);
        }

        toast({
          title: "Success",
          description: "Dismissal group updated successfully",
        });
      } else {
        const { data: newGroup, error } = await supabase
          .from('dismissal_groups')
          .insert(groupData)
          .select('id')
          .single();

        if (error) throw error;
        groupId = newGroup.id;

        toast({
          title: "Success",
          description: "Dismissal group created successfully",
        });
      }

      // Handle bus assignments for bus groups
      if (data.group_type === 'bus' && data.bus_ids && data.bus_ids.length > 0) {
        const busAssignments = data.bus_ids.map(busId => ({
          dismissal_group_id: groupId,
          bus_id: busId,
        }));

        const { error: busError } = await supabase
          .from('dismissal_group_buses')
          .insert(busAssignments);

        if (busError) throw busError;
      }

      // Handle car line assignments for car groups
      if (data.group_type === 'car' && data.car_line_ids && data.car_line_ids.length > 0) {
        const carLineAssignments = data.car_line_ids.map(carLineId => ({
          dismissal_group_id: groupId,
          car_line_id: carLineId,
        }));

        const { error: carLineError } = await supabase
          .from('dismissal_group_car_lines')
          .insert(carLineAssignments);

        if (carLineError) throw carLineError;
      }

      // Handle class assignments for class groups
      if (data.group_type === 'class' && data.class_ids && data.class_ids.length > 0) {
        const classAssignments = data.class_ids.map(classId => ({
          dismissal_group_id: groupId,
          class_id: classId,
        }));

        const { error: classError } = await supabase
          .from('dismissal_group_classes')
          .insert(classAssignments);

        if (classError) throw classError;
      }

      // Handle activity assignments for activity groups
      if (data.group_type === 'activity' && data.activity_ids && data.activity_ids.length > 0) {
        const activityAssignments = data.activity_ids.map(activityId => ({
          dismissal_group_id: groupId,
          after_school_activity_id: activityId,
        }));

        const { error: activityError } = await supabase
          .from('dismissal_group_activities')
          .insert(activityAssignments);

        if (activityError) throw activityError;
      }

      setShowAddDialog(false);
      setEditingGroup(null);
      form.reset();
      fetchPlanAndGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast({
        title: "Error",
        description: "Failed to save dismissal group",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (group: DismissalGroup) => {
    setEditingGroup(group);

    // Fetch existing assignments based on group type
    let existingBusIds: string[] = [];
    let existingCarLineIds: string[] = [];
    let existingClassIds: string[] = [];
    let existingActivityIds: string[] = [];

    if (group.group_type === 'bus') {
      try {
        const { data } = await supabase
          .from('dismissal_group_buses')
          .select('bus_id')
          .eq('dismissal_group_id', group.id);
        
        existingBusIds = data?.map(assignment => assignment.bus_id) || [];
      } catch (error) {
        console.error('Error fetching bus assignments:', error);
      }
    }

    if (group.group_type === 'car') {
      try {
        const { data } = await supabase
          .from('dismissal_group_car_lines')
          .select('car_line_id')
          .eq('dismissal_group_id', group.id);
        
        existingCarLineIds = data?.map(assignment => assignment.car_line_id) || [];
      } catch (error) {
        console.error('Error fetching car line assignments:', error);
      }
    }

    if (group.group_type === 'class') {
      try {
        const { data } = await supabase
          .from('dismissal_group_classes')
          .select('class_id, classes!inner(academic_session_id)')
          .eq('dismissal_group_id', group.id)
          .eq('classes.academic_session_id', selectedSessionId);
        
        existingClassIds = data?.map(assignment => assignment.class_id) || [];
        if (existingClassIds.length > 0) {
          setSelectedGrade("ALL_GRADES");
        }
      } catch (error) {
        console.error('Error fetching class assignments:', error);
      }
    }

    if (group.group_type === 'activity') {
      try {
        const { data } = await supabase
          .from('dismissal_group_activities')
          .select('after_school_activity_id')
          .eq('dismissal_group_id', group.id);
        
        existingActivityIds = data?.map(assignment => assignment.after_school_activity_id) || [];
      } catch (error) {
        console.error('Error fetching activity assignments:', error);
      }
    }

    form.reset({
      name: group.name,
      group_type: group.group_type,
      release_offset_minutes: group.release_offset_minutes || 0,
      walker_location_id: group.walker_location_id || "",
      car_rider_type: group.car_rider_type || 'all_remaining',
      car_rider_capacity: group.car_rider_capacity || undefined,
      bus_ids: existingBusIds,
      car_line_ids: existingCarLineIds,
      class_ids: existingClassIds,
      activity_ids: existingActivityIds,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('dismissal_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dismissal group deleted successfully",
      });

      fetchPlanAndGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete dismissal group",
        variant: "destructive",
      });
    }
  };

  // Helper function to calculate actual release time from offset
  const calculateReleaseTime = (group: DismissalGroup): Date | null => {
    if (!plan?.dismissal_time || group.release_offset_minutes === undefined) return null;
    
    // Parse the dismissal time and add the offset
    const baseTime = new Date(`2000-01-01T${plan.dismissal_time}`);
    baseTime.setMinutes(baseTime.getMinutes() + group.release_offset_minutes);
    return baseTime;
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'bus':
        return <Bus className="h-5 w-5 text-blue-500" />;
      case 'class':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'walker':
        return <MapPin className="h-5 w-5 text-orange-500" />;
      case 'car':
        return <Car className="h-5 w-5 text-purple-500" />;
      case 'activity':
        return <GraduationCap className="h-5 w-5 text-emerald-500" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'bus':
        return 'Bus';
      case 'class':
        return 'Class';
      case 'walker':
        return 'Walker';
      case 'car':
        return 'Car Rider';
      case 'activity':
        return 'After School Activity';
      default:
        return type;
    }
  };

  const getStudentCount = (group: DismissalGroup): number => {
    // For car rider groups with count type, show capacity
    if (group.group_type === 'car' && group.car_rider_type === 'count' && group.car_rider_capacity) {
      return group.car_rider_capacity;
    }
    
    // For car rider groups with all_remaining type, we can't show exact count
    if (group.group_type === 'car' && group.car_rider_type === 'all_remaining') {
      return 0; // Will be handled in display logic
    }

    let count = 0;

    // Count students directly assigned to the group
    count += group.dismissal_group_students?.length || 0;

    // Count students from assigned buses
    if (group.group_type === 'bus' && group.dismissal_group_buses) {
      group.dismissal_group_buses.forEach(assignment => {
        if (assignment.buses?.student_bus_assignments) {
          count += assignment.buses.student_bus_assignments.length;
        }
      });
    }

    // Count students from assigned classes
    if (group.group_type === 'class' && group.dismissal_group_classes) {
      group.dismissal_group_classes.forEach(assignment => {
        if (assignment.classes?.class_rosters) {
          count += assignment.classes.class_rosters.length;
        }
      });
    }

    // Count students from assigned activities
    if (group.group_type === 'activity' && group.dismissal_group_activities && Array.isArray(group.dismissal_group_activities)) {
      group.dismissal_group_activities.forEach(assignment => {
        if (assignment.after_school_activities?.student_after_school_assignments) {
          count += assignment.after_school_activities.student_after_school_assignments.length;
        }
      });
    }

    // For walker and car groups, we only have direct assignments for now
    // since student-walker and student-car assignments may not exist yet

    return count;
  };

  if (!user || userRole !== 'school_admin') {
    return null;
  }

  if (loading) {
    return (
      <>
        <div className="flex h-screen w-full">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <div className="flex h-screen w-full">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Plan Not Found</h2>
              <p className="text-muted-foreground mb-4">The dismissal plan you're looking for doesn't exist.</p>
              <Button onClick={() => navigate('/dashboard/dismissal-plans')}>
                Back to Plans
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-background w-full">
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold">{schoolName || plan.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Manage dismissal groups for this plan
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Sign Out
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Plan Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan?.name ? plan.name + " Details" : "Plan Details"}</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/dashboard/dismissal-plans')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Plans
                    </Button>
                    {plan.is_default && <Badge variant="default">Default</Badge>}
                    <Badge
                      variant={plan.status === 'active' ? 'secondary' : 'outline'}
                      className={plan.status === 'active' ? undefined : 'bg-muted text-muted-foreground border-transparent'}
                    >
                      {plan.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardTitle>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dismissal Time</p>
                    <p className="font-medium">
                      {plan.dismissal_time ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(`2000-01-01T${plan.dismissal_time}`), 'h:mm a')}
                        </span>
                      ) : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Groups</p>
                    <p className="font-medium">{groups.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Groups</p>
                    <p className="font-medium">{groups.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Groups Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Dismissal Groups</CardTitle>
                    <CardDescription>
                      Create and manage groups for this dismissal plan
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Academic Session Selector */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="session-select" className="text-sm whitespace-nowrap">Academic Year:</Label>
                      <Select
                        value={selectedSessionId || undefined}
                        onValueChange={(value) => setSelectedSessionId(value)}
                      >
                        <SelectTrigger id="session-select" className="w-[200px]">
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicSessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.session_name}
                              {session.is_active && <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSessionId && (
                      <Badge variant="outline" className="ml-2">
                        Viewing: {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                      </Badge>
                    )}
                  </div>
                  
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setEditingGroup(null);
                          form.reset({
                            name: "",
                            group_type: 'bus',
                            release_offset_minutes: 0,
                            walker_location_id: "",
                            bus_ids: [],
                            car_line_ids: [],
                            class_ids: [],
                            activity_ids: [],
                            car_rider_type: 'all_remaining',
                            car_rider_capacity: undefined,
                          });
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingGroup ? 'Edit Dismissal Group' : 'Add New Dismissal Group'}
                        </DialogTitle>
                        <DialogDescription>
                          Create a group to organize student dismissals.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Group Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter group name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="group_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Group Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select group type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="bus">Bus</SelectItem>
                                     <SelectItem value="class">Class</SelectItem>
                                     <SelectItem value="walker">Walker</SelectItem>
                                     <SelectItem value="car">Car Rider</SelectItem>
                                     <SelectItem value="activity">After School Activity</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="release_offset_minutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Release Time Offset</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      max="180"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                    <span className="text-sm text-muted-foreground">minutes after dismissal</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch('group_type') === 'walker' && (
                            <FormField
                              control={form.control}
                              name="walker_location_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Walker Location</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select walker location" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {walkerLocations.map((location) => (
                                        <SelectItem key={location.id} value={location.id}>
                                          {location.location_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {form.watch('group_type') === 'bus' && (
                            <FormField
                              control={form.control}
                              name="bus_ids"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Select Buses</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            "justify-between",
                                            !field.value?.length && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value?.length
                                            ? `${field.value.length} bus${field.value.length !== 1 ? 'es' : ''} selected`
                                            : "Select buses"}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput placeholder="Search buses..." />
                                        <CommandList>
                                          <CommandEmpty>No buses found.</CommandEmpty>
                                          <CommandGroup>
                                            {buses.map((bus) => (
                                              <CommandItem
                                                key={bus.id}
                                                onSelect={() => {
                                                  const currentValues = field.value || [];
                                                  const isSelected = currentValues.includes(bus.id);
                                                  
                                                  if (isSelected) {
                                                    field.onChange(currentValues.filter(id => id !== bus.id));
                                                  } else {
                                                    field.onChange([...currentValues, bus.id]);
                                                  }
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value?.includes(bus.id) ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                Bus {bus.bus_number}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {field.value?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {field.value.map((busId) => {
                                        const bus = buses.find(b => b.id === busId);
                                        if (!bus) return null;
                                        return (
                                          <Badge key={busId} variant="secondary" className="text-xs">
                                            Bus {bus.bus_number}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                field.onChange(field.value?.filter(id => id !== busId));
                                              }}
                                            >
                                              <X className="h-2 w-2" />
                                            </Button>
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {form.watch('group_type') === 'car' && (
                            <>
                              <FormField
                                control={form.control}
                                name="car_rider_type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Car Rider Configuration</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <input 
                                            type="radio" 
                                            id="count" 
                                            name="car_rider_type"
                                            value="count"
                                            checked={field.value === 'count'}
                                            onChange={() => field.onChange('count')}
                                          />
                                          <label htmlFor="count" className="text-sm">Specific count (dismiss first X ready students)</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <input 
                                            type="radio" 
                                            id="all_remaining" 
                                            name="car_rider_type"
                                            value="all_remaining"
                                            checked={field.value === 'all_remaining'}
                                            onChange={() => field.onChange('all_remaining')}
                                          />
                                          <label htmlFor="all_remaining" className="text-sm">All remaining ready students</label>
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {form.watch('car_rider_type') === 'count' && (
                                <FormField
                                  control={form.control}
                                  name="car_rider_capacity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Number of Students</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="1"
                                          max="999"
                                          placeholder="Enter number of students (e.g., 30)"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </>
                          )}

                          {form.watch('group_type') === 'class' && (
                            <FormField
                              control={form.control}
                              name="class_ids"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Select Classes</FormLabel>
                                  <div className="space-y-2">
                                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Filter by grade (optional)" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-background z-50">
                                        <SelectItem value="ALL_GRADES">All Grades</SelectItem>
                                        {Array.from(new Set(classes.map(c => c.grade_level).filter(Boolean))).sort().map((grade) => (
                                          <SelectItem key={grade} value={grade!}>{grade}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "justify-between",
                                              !field.value?.length && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value?.length
                                              ? `${field.value.length} class${field.value.length !== 1 ? 'es' : ''} selected`
                                              : "Select classes"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-full p-0 bg-background z-50">
                                        <Command>
                                          <CommandInput placeholder="Search classes..." />
                                          <CommandList>
                                            <CommandEmpty>No classes found.</CommandEmpty>
                                            <CommandGroup>
                                               {classes
                                                 .filter(cls => selectedGrade === "ALL_GRADES" || !selectedGrade || cls.grade_level === selectedGrade)
                                                 .map((cls) => (
                                                <CommandItem
                                                  key={cls.id}
                                                  onSelect={() => {
                                                    const currentValues = field.value || [];
                                                    const isSelected = currentValues.includes(cls.id);
                                                    
                                                    if (isSelected) {
                                                      field.onChange(currentValues.filter(id => id !== cls.id));
                                                    } else {
                                                      field.onChange([...currentValues, cls.id]);
                                                    }
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      field.value?.includes(cls.id) ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  {cls.class_name}{cls.grade_level ? ` - ${cls.grade_level}` : ''}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  {field.value?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {field.value.map((classId) => {
                                        const cls = classes.find(c => c.id === classId);
                                        if (!cls) return null;
                                        return (
                                          <Badge key={classId} variant="secondary" className="text-xs">
                                            {cls.class_name}{cls.grade_level ? ` - ${cls.grade_level}` : ''}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                field.onChange(field.value?.filter(id => id !== classId));
                                              }}
                                            >
                                              <X className="h-2 w-2" />
                                            </Button>
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                             />
                           )}

                           {form.watch('group_type') === 'activity' && (
                             <FormField
                               control={form.control}
                               name="activity_ids"
                               render={({ field }) => (
                                 <FormItem className="flex flex-col">
                                   <FormLabel>Select Activities</FormLabel>
                                   <Popover>
                                     <PopoverTrigger asChild>
                                       <FormControl>
                                         <Button
                                           variant="outline"
                                           role="combobox"
                                           className={cn(
                                             "justify-between",
                                             !field.value?.length && "text-muted-foreground"
                                           )}
                                         >
                                           {field.value?.length
                                             ? `${field.value.length} activit${field.value.length !== 1 ? 'ies' : 'y'} selected`
                                             : "Select activities"}
                                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                         </Button>
                                       </FormControl>
                                     </PopoverTrigger>
                                     <PopoverContent className="w-full p-0 bg-background z-50">
                                       <Command>
                                         <CommandInput placeholder="Search activities..." />
                                         <CommandList>
                                           <CommandEmpty>No activities found.</CommandEmpty>
                                           <CommandGroup>
                                             {availableActivities.map((activity) => (
                                               <CommandItem
                                                 key={activity.id}
                                                 onSelect={() => {
                                                   const currentValues = field.value || [];
                                                   const isSelected = currentValues.includes(activity.id);
                                                   
                                                   if (isSelected) {
                                                     field.onChange(currentValues.filter(id => id !== activity.id));
                                                   } else {
                                                     field.onChange([...currentValues, activity.id]);
                                                   }
                                                 }}
                                               >
                                                 <Check
                                                   className={cn(
                                                     "mr-2 h-4 w-4",
                                                     field.value?.includes(activity.id) ? "opacity-100" : "opacity-0"
                                                   )}
                                                 />
                                                 {activity.activity_name}
                                               </CommandItem>
                                             ))}
                                           </CommandGroup>
                                         </CommandList>
                                       </Command>
                                     </PopoverContent>
                                   </Popover>
                                   {field.value?.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-2">
                                       {field.value.map((activityId) => {
                                         const activity = availableActivities.find(a => a.id === activityId);
                                         if (!activity) return null;
                                         return (
                                           <Badge key={activityId} variant="secondary" className="text-xs">
                                             {activity.activity_name}
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                                               onClick={(e) => {
                                                 e.preventDefault();
                                                 field.onChange(field.value?.filter(id => id !== activityId));
                                               }}
                                             >
                                               <X className="h-2 w-2" />
                                             </Button>
                                           </Badge>
                                         );
                                       })}
                                     </div>
                                   )}
                                   <FormMessage />
                                 </FormItem>
                               )}
                             />
                           )}

                           <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit">
                              {editingGroup ? 'Update Group' : 'Create Group'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent>
                {groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No dismissal groups found. Create your first group to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups
                      .sort((a, b) => {
                        // Sort by release_offset_minutes, earliest first
                        const offsetA = a.release_offset_minutes ?? 0;
                        const offsetB = b.release_offset_minutes ?? 0;
                        return offsetA - offsetB;
                      })
                      .map((group) => (
                      <Card key={group.id} className="border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center gap-2">
                              {getGroupIcon(group.group_type)}
                              {group.name}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getGroupTypeLabel(group.group_type)}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {group.release_offset_minutes !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Release Time:</span>
                              <span className="text-sm font-medium">
                                {calculateReleaseTime(group) ? (
                                  format(calculateReleaseTime(group)!, 'h:mm a')
                                ) : (
                                  group.release_offset_minutes === 0 ? 'Immediate' : `+${group.release_offset_minutes}min`
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Students:</span>
                            <span className="text-sm font-medium">
                              {group.group_type === 'car' && group.car_rider_type === 'count' 
                                ? `Up to ${group.car_rider_capacity}`
                                : group.group_type === 'car' && group.car_rider_type === 'all_remaining'
                                ? 'All remaining ready'
                                : getStudentCount(group)}
                            </span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(group)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(group.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}
