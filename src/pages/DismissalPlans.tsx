import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MoreHorizontal, Edit, Trash2, Settings, CalendarDays, Users, Clock, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useImpersonation } from "@/hooks/useImpersonation";

interface DismissalPlan {
  id: string;
  name: string;
  description?: string;
  dismissal_time?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  start_date?: string;
  end_date?: string;
  created_at: string;
  groups_count?: number;
}

const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  dismissal_time: z.string().optional(),
  is_default: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function DismissalPlans() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { impersonatedSchoolId } = useImpersonation();

  const [plans, setPlans] = useState<DismissalPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<DismissalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'dismissal_time'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DismissalPlan | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolDismissalTime, setSchoolDismissalTime] = useState<string>('');
  const [showTimeWarningDialog, setShowTimeWarningDialog] = useState(false);
  const [pendingPlanData, setPendingPlanData] = useState<PlanFormData | null>(null);
  const itemsPerPage = 10;

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      dismissal_time: "",
      is_default: false,
      status: 'active',
      start_date: "",
      end_date: "",
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const canAccess = userRole === 'school_admin' || (userRole === 'system_admin' && !!impersonatedSchoolId);
    if (!canAccess) {
      navigate('/dashboard');
      return;
    }
  }, [user, userRole, impersonatedSchoolId, navigate]);

  useEffect(() => {
    if (user) {
      fetchSchoolInfo();
      fetchPlans();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...plans];

    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(plan => plan.status === filterStatus);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue as string).getTime().toString();
        bValue = new Date(bValue as string).getTime().toString();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

    setFilteredPlans(filtered);
    setCurrentPage(1);
  }, [plans, searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchSchoolInfo = async () => {
    if (!user) return;

    try {
      if (userRole === 'system_admin' && impersonatedSchoolId) {
        const { data: school } = await supabase
          .from('schools')
          .select('school_name, dismissal_time')
          .eq('id', impersonatedSchoolId)
          .single();
        if (school) {
          setSchoolName(school.school_name || '');
          setSchoolDismissalTime(school.dismissal_time || '');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('school_name, dismissal_time')
          .eq('id', profile.school_id)
          .single();

        if (school) {
          setSchoolName(school.school_name || '');
          setSchoolDismissalTime(school.dismissal_time || '');
        }
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchPlans = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const effectiveSchoolId = (userRole === 'system_admin' && impersonatedSchoolId) ? impersonatedSchoolId : null;
      let schoolIdToUse: number | null = effectiveSchoolId;

      if (!schoolIdToUse) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        schoolIdToUse = profile?.school_id ?? null;
      }

      if (!schoolIdToUse) return;

      const { data, error } = await supabase
        .from('dismissal_plans')
        .select(`
          *,
          dismissal_groups(id)
        `)
        .eq('school_id', schoolIdToUse)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const plansWithCounts = data?.map(plan => ({
        ...plan,
        groups_count: plan.dismissal_groups?.length || 0,
        status: plan.status as 'active' | 'inactive'
      })) || [];

      setPlans(plansWithCounts);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load dismissal plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PlanFormData) => {
    if (!user) return;

    try {
      let schoolIdToUse: number | null = (userRole === 'system_admin' && impersonatedSchoolId) ? impersonatedSchoolId : null;
      if (!schoolIdToUse) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        schoolIdToUse = profile?.school_id ?? null;
      }

      if (!schoolIdToUse) return;

      const planData = {
        name: data.name,
        description: data.description,
        dismissal_time: data.dismissal_time || schoolDismissalTime,
        is_default: data.is_default,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        school_id: schoolIdToUse,
      };

      // Check if dismissal time changed for existing plan
      const dismissalTimeChanged = editingPlan && 
        editingPlan.dismissal_time !== planData.dismissal_time;

      // If time changed, check if today's dismissal has started
      if (editingPlan && dismissalTimeChanged && planData.dismissal_time) {
        const today = new Date().toISOString().slice(0, 10);
        
        const { data: todayRun } = await supabase
          .from('dismissal_runs')
          .select('id, plan_id, status, started_by, started_at')
          .eq('school_id', schoolIdToUse)
          .eq('date', today)
          .maybeSingle();

        // Check if run exists, uses this plan, and has started or completed
        if (todayRun && 
            (todayRun.plan_id === editingPlan.id || (data.is_default && !todayRun.plan_id)) &&
            (todayRun.started_by || todayRun.status === 'completed' || todayRun.status === 'cancelled')) {
          // Show warning dialog and store pending data
          setPendingPlanData(data);
          setShowTimeWarningDialog(true);
          return;
        }
      }

      // Proceed with the update
      await savePlan(data, planData, schoolIdToUse, dismissalTimeChanged);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save dismissal plan",
        variant: "destructive",
      });
    }
  };

  const savePlan = async (data: PlanFormData, planData: any, schoolIdToUse: number, dismissalTimeChanged: boolean) => {
    try {
      // If setting as default, remove default from other plans
      if (data.is_default) {
        await supabase
          .from('dismissal_plans')
          .update({ is_default: false })
          .eq('school_id', schoolIdToUse);
      }

      if (editingPlan) {
        const { error } = await supabase
          .from('dismissal_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        // If dismissal time changed, try to update today's run if it hasn't started
        if (dismissalTimeChanged && planData.dismissal_time) {
          const today = new Date().toISOString().slice(0, 10);
          
          const { data: todayRun } = await supabase
            .from('dismissal_runs')
            .select('id, plan_id, status, started_by')
            .eq('school_id', schoolIdToUse)
            .eq('date', today)
            .maybeSingle();

          // Only update if run exists, uses this plan, and hasn't started
          if (todayRun && 
              (todayRun.plan_id === editingPlan.id || (data.is_default && !todayRun.plan_id)) &&
              !todayRun.started_by && 
              todayRun.status !== 'completed' && 
              todayRun.status !== 'cancelled') {
            
            const { data: school } = await supabase
              .from('schools')
              .select('timezone, preparation_time_minutes')
              .eq('id', schoolIdToUse)
              .single();

            const { data: updateResult, error: updateError } = await supabase
              .rpc('update_dismissal_run_times', {
                run_id: todayRun.id,
                new_dismissal_time: planData.dismissal_time,
                school_timezone: school?.timezone || 'America/New_York',
                preparation_minutes: school?.preparation_time_minutes || 5
              });

            if (updateError) {
              console.warn('Failed to update run times:', updateError);
            } else if (updateResult) {
              toast({
                title: "Plan Updated",
                description: "Dismissal plan updated and today's run times have been adjusted",
              });
              setShowAddDialog(false);
              setEditingPlan(null);
              form.reset();
              fetchPlans();
              return;
            }
          }
        }

        toast({
          title: "Plan Updated",
          description: dismissalTimeChanged && pendingPlanData 
            ? "Dismissal plan updated. The new time will take effect tomorrow as today's dismissal has already started"
            : "Dismissal plan updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('dismissal_plans')
          .insert(planData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Dismissal plan created successfully",
        });
      }

      setShowAddDialog(false);
      setEditingPlan(null);
      setPendingPlanData(null);
      form.reset();
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      throw error;
    }
  };

  const handleEdit = (plan: DismissalPlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description || "",
      dismissal_time: plan.dismissal_time || "",
      is_default: plan.is_default,
      status: plan.status,
      start_date: plan.start_date || "",
      end_date: plan.end_date || "",
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('dismissal_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dismissal plan deleted successfully",
      });

      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete dismissal plan",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-500">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlans = filteredPlans.slice(startIndex, endIndex);

  if (!user || (userRole !== 'school_admin' && !(userRole === 'system_admin' && impersonatedSchoolId))) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showTimeWarningDialog} onOpenChange={setShowTimeWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismissal Already Started</AlertDialogTitle>
            <AlertDialogDescription>
              Today's dismissal has already started or completed. The new dismissal time will take effect tomorrow. Do you want to proceed with this change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingPlanData(null);
              setShowTimeWarningDialog(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (pendingPlanData) {
                setShowTimeWarningDialog(false);
                const schoolIdToUse = (userRole === 'system_admin' && impersonatedSchoolId) ? impersonatedSchoolId : null;
                let schoolId = schoolIdToUse;
                
                if (!schoolId) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('school_id')
                    .eq('id', user!.id)
                    .single();
                  schoolId = profile?.school_id ?? null;
                }

                if (schoolId) {
                  const planData = {
                    name: pendingPlanData.name,
                    description: pendingPlanData.description,
                    dismissal_time: pendingPlanData.dismissal_time || schoolDismissalTime,
                    is_default: pendingPlanData.is_default,
                    status: pendingPlanData.status,
                    start_date: pendingPlanData.start_date || null,
                    end_date: pendingPlanData.end_date || null,
                    school_id: schoolId,
                  };
                  
                  await savePlan(pendingPlanData, planData, schoolId, true);
                }
              }
            }}>
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold">{schoolName || 'Dismissal Plans'}</h1>
            <p className="text-sm text-muted-foreground">
              Manage dismissal plans and schedules
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plans.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans.filter(p => p.status === 'active').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Default Plan</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans.find(p => p.is_default)?.name || 'None'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + (p.groups_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plans Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dismissal Plans</CardTitle>
                  <CardDescription>
                    Create and manage dismissal plans for your school
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingPlan(null);
                        form.reset({
                          name: "",
                          description: "",
                          dismissal_time: schoolDismissalTime,
                          is_default: false,
                          status: 'active',
                          start_date: "",
                          end_date: "",
                        });
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPlan ? 'Edit Dismissal Plan' : 'Add New Dismissal Plan'}
                      </DialogTitle>
                      <DialogDescription>
                        Create a new dismissal plan with specific settings and schedules.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plan Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter plan name" {...field} />
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
                                <Textarea 
                                  placeholder="Enter plan description" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dismissal_time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dismissal Time</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="time" 
                                    placeholder={schoolDismissalTime || "15:00"}
                                    {...field} 
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="start_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="end_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="is_default"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Set as default plan
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  This plan will be used as the default dismissal plan
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingPlan ? 'Update Plan' : 'Create Plan'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex gap-4 mt-4">
                <Input
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      Plan Name
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Dismissal Time</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div>
                          {plan.name}
                          {plan.is_default && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Default Plan
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{plan.description || '-'}</TableCell>
                      <TableCell>
                        {plan.dismissal_time ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(`2000-01-01T${plan.dismissal_time}`), 'h:mm a')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {plan.start_date && plan.end_date ? (
                          <div className="text-sm">
                            {format(parseISO(plan.start_date), 'MMM dd')} - {format(parseISO(plan.end_date), 'MMM dd, yyyy')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(plan.status)}
                      </TableCell>
                      <TableCell>{plan.groups_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(plan)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard/dismissal-plans/${plan.id}/groups`)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Manage Groups
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(plan.id)}
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

              {filteredPlans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No dismissal plans found.
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredPlans.length)} of {filteredPlans.length} plans
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
    </>
  );
}