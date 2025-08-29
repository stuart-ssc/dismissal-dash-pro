import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreHorizontal, Edit, UserPlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const afterSchoolActivitySchema = z.object({
  activity_name: z.string().min(1, "Activity name is required"),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  supervisor_name: z.string().optional().or(z.literal("")),
  capacity: z.number().min(1).optional().nullable(),
  status: z.enum(["active", "inactive"]),
});

interface AfterSchoolActivityRecord {
  id: string;
  activity_name: string;
  description?: string;
  location?: string;
  supervisor_name?: string;
  capacity?: number;
  status: string;
  students_count: number;
}

interface StudentSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  student_id?: string;
}

interface StudentAfterSchoolRecord {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  student_id?: string;
  assigned_at: string;
}

export function AfterSchoolActivitiesTab() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<AfterSchoolActivityRecord[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<AfterSchoolActivityRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<keyof AfterSchoolActivityRecord>('activity_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AfterSchoolActivityRecord | null>(null);
  
  // Student management state
  const [managingStudents, setManagingStudents] = useState<AfterSchoolActivityRecord | null>(null);
  const [activityStudents, setActivityStudents] = useState<StudentAfterSchoolRecord[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const itemsPerPage = 10;
  
  const form = useForm<z.infer<typeof afterSchoolActivitySchema>>({
    resolver: zodResolver(afterSchoolActivitySchema),
    defaultValues: {
      activity_name: "",
      description: "",
      location: "",
      supervisor_name: "",
      status: "active",
    },
  });

  useEffect(() => {
    fetchAfterSchoolActivities();
  }, []);

  useEffect(() => {
    filterAndSortActivities();
  }, [activities, searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchAfterSchoolActivities = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        setActivities([]);
        setFilteredActivities([]);
        return;
      }

      const { data: activitiesData, error } = await supabase
        .from('after_school_activities')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('activity_name');

      if (error) {
        console.error('Error fetching after school activities:', error);
        return;
      }

      // Fetch student counts for each activity
      const activityCounts = new Map<string, number>();
      if (activitiesData && activitiesData.length > 0) {
        for (const activity of activitiesData) {
          const { count } = await supabase
            .from('student_after_school_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('after_school_activity_id', activity.id);
          activityCounts.set(activity.id, count || 0);
        }
      }

      const activitiesWithCounts = (activitiesData || []).map(activity => ({
        ...activity,
        students_count: activityCounts.get(activity.id) || 0
      })) as AfterSchoolActivityRecord[];

      setActivities(activitiesWithCounts);
      setFilteredActivities(activitiesWithCounts);
    } catch (error) {
      console.error('Error fetching after school activities:', error);
    }
  };

  const filterAndSortActivities = () => {
    let filtered = [...activities];

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (activity.supervisor_name && activity.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === filterStatus);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal === bVal) return 0;
      const comparison = aVal! < bVal! ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredActivities(filtered);
    setCurrentPage(1);
  };

  const onSubmit = async (values: z.infer<typeof afterSchoolActivitySchema>) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile?.school_id) {
        toast.error('Unable to determine school');
        return;
      }

      if (editingRecord) {
        const { error } = await supabase
          .from('after_school_activities')
          .update(values)
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast.success('Activity updated successfully');
      } else {
        const insertData: any = {
          activity_name: values.activity_name,
          school_id: profile.school_id,
          status: values.status,
        };
        
        if (values.description) insertData.description = values.description;
        if (values.location) insertData.location = values.location;
        if (values.supervisor_name) insertData.supervisor_name = values.supervisor_name;
        if (values.capacity) insertData.capacity = values.capacity;

        const { error } = await supabase
          .from('after_school_activities')
          .insert(insertData);

        if (error) throw error;
        toast.success('Activity added successfully');
      }

      form.reset();
      setShowAddDialog(false);
      setEditingRecord(null);
      fetchAfterSchoolActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    }
  };

  const handleDelete = async (activity: AfterSchoolActivityRecord) => {
    try {
      const { error } = await supabase
        .from('after_school_activities')
        .delete()
        .eq('id', activity.id);

      if (error) throw error;
      toast.success('Activity deleted successfully');
      fetchAfterSchoolActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  const handleManageActivityStudents = async (activity: AfterSchoolActivityRecord) => {
    setManagingStudents(activity);
    setIsLoadingStudents(true);
    await fetchActivityStudents(activity.id);
    setIsLoadingStudents(false);
  };

  const fetchActivityStudents = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_after_school_assignments')
        .select(`
          id,
          assigned_at,
          student_id
        `)
        .eq('after_school_activity_id', activityId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setActivityStudents([]);
        return;
      }

      // Fetch student details separately
      const studentIds = data.map(assignment => assignment.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, student_id')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Combine assignment and student data
      const studentsWithAssignments = data.map(assignment => {
        const student = studentsData?.find(s => s.id === assignment.student_id);
        return {
          id: student?.id || assignment.student_id,
          first_name: student?.first_name || '',
          last_name: student?.last_name || '',
          grade_level: student?.grade_level || '',
          student_id: student?.student_id || '',
          assigned_at: assignment.assigned_at
        };
      }).filter(student => student.first_name) as StudentAfterSchoolRecord[];

      setActivityStudents(studentsWithAssignments);
    } catch (error) {
      console.error('Error fetching activity students:', error);
      toast.error('Failed to load students');
    }
  };

  const searchAvailableStudents = async (searchTerm: string) => {
    if (!searchTerm.trim() || !managingStudents) return;

    setIsSearchingStudents(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.school_id) return;

      // Get currently assigned student IDs
      const assignedStudentIds = activityStudents.map(s => s.id);

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, student_id')
        .eq('school_id', profile.school_id)
        .not('id', 'in', `(${assignedStudentIds.join(',') || 'null'})`)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      setStudentSearchResults(data || []);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const addStudentToActivity = async (student: StudentSearchResult) => {
    if (!managingStudents) return;

    try {
      const { error } = await supabase
        .from('student_after_school_assignments')
        .insert({
          student_id: student.id,
          after_school_activity_id: managingStudents.id
        });

      if (error) throw error;

      toast.success(`${student.first_name} ${student.last_name} added to activity`);
      await fetchActivityStudents(managingStudents.id);
      await fetchAfterSchoolActivities(); // Refresh activity counts
      setStudentSearchTerm('');
      setStudentSearchResults([]);
    } catch (error) {
      console.error('Error adding student to activity:', error);
      toast.error('Failed to add student');
    }
  };

  const removeStudentFromActivity = async (student: StudentAfterSchoolRecord) => {
    if (!managingStudents) return;

    try {
      const { error } = await supabase
        .from('student_after_school_assignments')
        .delete()
        .eq('student_id', student.id)
        .eq('after_school_activity_id', managingStudents.id);

      if (error) throw error;

      toast.success(`${student.first_name} ${student.last_name} removed from activity`);
      await fetchActivityStudents(managingStudents.id);
      await fetchAfterSchoolActivities(); // Refresh activity counts
    } catch (error) {
      console.error('Error removing student from activity:', error);
      toast.error('Failed to remove student');
    }
  };

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">After School Activities Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage after school activities and student assignments
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit Activity' : 'Add New Activity'}
              </DialogTitle>
              <DialogDescription>
                {editingRecord ? 'Update the activity details.' : 'Create a new after school activity.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="activity_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Chess Club" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Room 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supervisor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Activity supervisor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Maximum students" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Update' : 'Add'} Activity
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Activity Name
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">{activity.activity_name}</TableCell>
                  <TableCell>{activity.description || '-'}</TableCell>
                  <TableCell>{activity.location || '-'}</TableCell>
                  <TableCell>{activity.supervisor_name || '-'}</TableCell>
                  <TableCell>{activity.capacity ? `${activity.students_count}/${activity.capacity}` : activity.students_count}</TableCell>
                  <TableCell>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-primary"
                      onClick={() => handleManageActivityStudents(activity)}
                    >
                      {activity.students_count} students
                    </Button>
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
                        <DropdownMenuItem
                          onClick={() => handleManageActivityStudents(activity)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Manage Students
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingRecord(activity);
                        form.reset({
                           ...activity,
                           status: activity.status as "active" | "inactive"
                         });
                            setShowAddDialog(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(activity)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Activity
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Manage Students Dialog */}
      <Dialog open={!!managingStudents} onOpenChange={() => {
        setManagingStudents(null);
        setActivityStudents([]);
        setStudentSearchTerm('');
        setStudentSearchResults([]);
        setShowAddStudentDialog(false);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Students - {managingStudents?.activity_name}</DialogTitle>
            <DialogDescription>
              Add or remove students assigned to this after school activity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Current Students ({activityStudents.length})</h4>
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
              ) : activityStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No students assigned to this after school activity yet.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>{student.grade_level}</TableCell>
                          <TableCell>{student.student_id || '-'}</TableCell>
                          <TableCell>
                            {new Date(student.assigned_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeStudentFromActivity(student)}
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
            <DialogTitle>Add Student to After School Activity</DialogTitle>
            <DialogDescription>
              Search for students to assign to {managingStudents?.activity_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-student-search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="activity-student-search"
                  placeholder="Search by name..."
                  value={studentSearchTerm}
                  onChange={(e) => {
                    setStudentSearchTerm(e.target.value);
                    if (e.target.value.length >= 2) {
                      searchAvailableStudents(e.target.value);
                    } else {
                      setStudentSearchResults([]);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearchingStudents ? (
              <div className="text-center py-4">Searching...</div>
            ) : studentSearchResults.length > 0 ? (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Student ID</TableHead>
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
                        <TableCell>{student.student_id || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => addStudentToActivity(student)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : studentSearchTerm.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                No students found matching "{studentSearchTerm}"
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}