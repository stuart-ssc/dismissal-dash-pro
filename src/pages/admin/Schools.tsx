import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, MoreVertical, Search, Filter, CheckCircle, Clock, AlertTriangle, XCircle, FileText, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

// US States for dropdown filter
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// Types matching public.schools table (simplified)
interface School {
  id: number;
  school_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  phone_number: string | null;
  school_logo: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  dismissal_time: string | null; // HH:MM:SS
  preparation_time_minutes: number | null;
  auto_dismissal_enabled: boolean | null;
  walkers_enabled: boolean | null;
  car_lines_enabled: boolean | null;
  email_notifications_enabled: boolean | null;
  sms_notifications_enabled: boolean | null;
  emergency_alerts_enabled: boolean | null;
  two_factor_required: boolean | null;
  session_timeout_enabled: boolean | null;
  audit_logs_enabled: boolean | null;
  verification_status?: string | null;
  flagged_reason?: string | null;
  created_at?: string;
}
const schema = z.object({
  school_name: z.string().min(1, "Name is required"),
  street_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipcode: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  school_logo: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  dismissal_time: z.string().optional().nullable(),
  preparation_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  auto_dismissal_enabled: z.boolean().optional().nullable(),
  walkers_enabled: z.boolean().optional().nullable(),
  car_lines_enabled: z.boolean().optional().nullable(),
  email_notifications_enabled: z.boolean().optional().nullable(),
  sms_notifications_enabled: z.boolean().optional().nullable(),
  emergency_alerts_enabled: z.boolean().optional().nullable(),
  two_factor_required: z.boolean().optional().nullable(),
  session_timeout_enabled: z.boolean().optional().nullable(),
  audit_logs_enabled: z.boolean().optional().nullable()
});
type FormValues = z.infer<typeof schema>;
function SchoolForm({
  initial,
  onClose
}: {
  initial?: Partial<School>;
  onClose: () => void;
}) {
  const isEdit = !!initial?.id;
  const {
    toast
  } = useToast();
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      school_name: initial?.school_name ?? "",
      street_address: initial?.street_address ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      zipcode: initial?.zipcode ?? "",
      phone_number: initial?.phone_number ?? "",
      school_logo: initial?.school_logo ?? "",
      primary_color: initial?.primary_color ?? "#3B82F6",
      secondary_color: initial?.secondary_color ?? "#EF4444",
      dismissal_time: (initial?.dismissal_time ?? "")?.slice(0, 5) || "",
      preparation_time_minutes: initial?.preparation_time_minutes ?? 5,
      auto_dismissal_enabled: initial?.auto_dismissal_enabled ?? false,
      walkers_enabled: initial?.walkers_enabled ?? true,
      car_lines_enabled: initial?.car_lines_enabled ?? true,
      email_notifications_enabled: initial?.email_notifications_enabled ?? true,
      sms_notifications_enabled: initial?.sms_notifications_enabled ?? false,
      emergency_alerts_enabled: initial?.emergency_alerts_enabled ?? true,
      two_factor_required: initial?.two_factor_required ?? false,
      session_timeout_enabled: initial?.session_timeout_enabled ?? false,
      audit_logs_enabled: initial?.audit_logs_enabled ?? true
    }
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        dismissal_time: values.dismissal_time ? `${values.dismissal_time}:00` : null
      } as Partial<School>;
      if (isEdit) {
        const {
          error
        } = await supabase.from("schools").update(payload).eq("id", initial!.id!);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from("schools").insert(payload as School);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["schools"]
      });
      toast({
        title: "Saved",
        description: "School has been saved."
      });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message ?? "Failed to save school.",
        variant: "destructive" as any
      });
    }
  });
  const handleFile = async (file: File) => {
    try {
      setUploadingLogo(true);
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('school-logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('school-logos').getPublicUrl(filePath);
      form.setValue('school_logo', data.publicUrl, { shouldDirty: true });
      toast({ title: 'Logo uploaded', description: 'Logo has been uploaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message ?? 'Could not upload logo.', variant: 'destructive' as any });
    } finally {
      setUploadingLogo(false);
    }
  };

  return <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={form.handleSubmit(values => upsertMutation.mutate(values))}>

      <div className="space-y-2">
        <Label htmlFor="school_name">Name</Label>
        <Input id="school_name" {...form.register("school_name")} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="street_address">Street Address</Label>
        <Input id="street_address" {...form.register("street_address")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select value={form.watch("state") || ""} onValueChange={(v) => form.setValue("state", v, { shouldDirty: true })}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent className="z-[60] bg-background">
              <SelectItem value="AL">Alabama</SelectItem>
              <SelectItem value="AK">Alaska</SelectItem>
              <SelectItem value="AZ">Arizona</SelectItem>
              <SelectItem value="AR">Arkansas</SelectItem>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="CO">Colorado</SelectItem>
              <SelectItem value="CT">Connecticut</SelectItem>
              <SelectItem value="DE">Delaware</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
              <SelectItem value="GA">Georgia</SelectItem>
              <SelectItem value="HI">Hawaii</SelectItem>
              <SelectItem value="ID">Idaho</SelectItem>
              <SelectItem value="IL">Illinois</SelectItem>
              <SelectItem value="IN">Indiana</SelectItem>
              <SelectItem value="IA">Iowa</SelectItem>
              <SelectItem value="KS">Kansas</SelectItem>
              <SelectItem value="KY">Kentucky</SelectItem>
              <SelectItem value="LA">Louisiana</SelectItem>
              <SelectItem value="ME">Maine</SelectItem>
              <SelectItem value="MD">Maryland</SelectItem>
              <SelectItem value="MA">Massachusetts</SelectItem>
              <SelectItem value="MI">Michigan</SelectItem>
              <SelectItem value="MN">Minnesota</SelectItem>
              <SelectItem value="MS">Mississippi</SelectItem>
              <SelectItem value="MO">Missouri</SelectItem>
              <SelectItem value="MT">Montana</SelectItem>
              <SelectItem value="NE">Nebraska</SelectItem>
              <SelectItem value="NV">Nevada</SelectItem>
              <SelectItem value="NH">New Hampshire</SelectItem>
              <SelectItem value="NJ">New Jersey</SelectItem>
              <SelectItem value="NM">New Mexico</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
              <SelectItem value="NC">North Carolina</SelectItem>
              <SelectItem value="ND">North Dakota</SelectItem>
              <SelectItem value="OH">Ohio</SelectItem>
              <SelectItem value="OK">Oklahoma</SelectItem>
              <SelectItem value="OR">Oregon</SelectItem>
              <SelectItem value="PA">Pennsylvania</SelectItem>
              <SelectItem value="RI">Rhode Island</SelectItem>
              <SelectItem value="SC">South Carolina</SelectItem>
              <SelectItem value="SD">South Dakota</SelectItem>
              <SelectItem value="TN">Tennessee</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
              <SelectItem value="UT">Utah</SelectItem>
              <SelectItem value="VT">Vermont</SelectItem>
              <SelectItem value="VA">Virginia</SelectItem>
              <SelectItem value="WA">Washington</SelectItem>
              <SelectItem value="WV">West Virginia</SelectItem>
              <SelectItem value="WI">Wisconsin</SelectItem>
              <SelectItem value="WY">Wyoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipcode">Zip Code</Label>
          <Input id="zipcode" {...form.register("zipcode")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone</Label>
        <Input id="phone_number" {...form.register("phone_number")} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="school_logo">Logo</Label>
        {form.watch("school_logo") && (
          <img
            src={form.watch("school_logo") || ''}
            alt="School logo preview"
            className="h-12 w-auto rounded border"
          />
        )}
        <div
          className="border-2 border-dashed rounded-md p-6 text-center text-sm text-muted-foreground"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) await handleFile(f); }}
        >
          <p>Drag and drop an image here, or click to browse</p>
          <Input
            id="school_logo_file"
            type="file"
            accept="image/*"
            onChange={async (e) => { const file = e.target.files?.[0]; if (file) await handleFile(file); }}
          />
          {uploadingLogo && (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary_color">Primary Color</Label>
        <Input id="primary_color" type="color" {...form.register("primary_color")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="secondary_color">Secondary Color</Label>
        <Input id="secondary_color" type="color" {...form.register("secondary_color")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dismissal_time">Dismissal Time</Label>
        <Input id="dismissal_time" type="time" step="60" {...form.register("dismissal_time")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preparation_time_minutes">Preparation Minutes</Label>
        <Input id="preparation_time_minutes" type="number" {...form.register("preparation_time_minutes", {
        valueAsNumber: true
      })} />
      </div>

      {/* Boolean toggles */}
      <div className="flex items-center justify-between">
        <Label htmlFor="auto_dismissal_enabled">Auto Dismissal</Label>
        <Switch id="auto_dismissal_enabled" checked={!!form.watch("auto_dismissal_enabled")} onCheckedChange={v => form.setValue("auto_dismissal_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="walkers_enabled">Walkers Enabled</Label>
        <Switch id="walkers_enabled" checked={!!form.watch("walkers_enabled")} onCheckedChange={v => form.setValue("walkers_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="car_lines_enabled">Car Lines Enabled</Label>
        <Switch id="car_lines_enabled" checked={!!form.watch("car_lines_enabled")} onCheckedChange={v => form.setValue("car_lines_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="email_notifications_enabled">Email Notifications</Label>
        <Switch id="email_notifications_enabled" checked={!!form.watch("email_notifications_enabled")} onCheckedChange={v => form.setValue("email_notifications_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="sms_notifications_enabled">SMS Notifications</Label>
        <Switch id="sms_notifications_enabled" checked={!!form.watch("sms_notifications_enabled")} onCheckedChange={v => form.setValue("sms_notifications_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="emergency_alerts_enabled">Emergency Alerts</Label>
        <Switch id="emergency_alerts_enabled" checked={!!form.watch("emergency_alerts_enabled")} onCheckedChange={v => form.setValue("emergency_alerts_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="two_factor_required">Two Factor Required</Label>
        <Switch id="two_factor_required" checked={!!form.watch("two_factor_required")} onCheckedChange={v => form.setValue("two_factor_required", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="session_timeout_enabled">Session Timeout</Label>
        <Switch id="session_timeout_enabled" checked={!!form.watch("session_timeout_enabled")} onCheckedChange={v => form.setValue("session_timeout_enabled", v)} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="audit_logs_enabled">Audit Logs</Label>
        <Switch id="audit_logs_enabled" checked={!!form.watch("audit_logs_enabled")} onCheckedChange={v => form.setValue("audit_logs_enabled", v)} />
      </div>

      <div className="col-span-1 md:col-span-2 flex gap-3 justify-end pt-2">
        <Button type="submit" disabled={upsertMutation.isPending}>
          {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>;
}
export default function AdminSchools() {
  const {
    userRole,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    document.title = "Manage Schools | System Administration";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Manage schools, settings, and access for Dismissal Pro.");
  }, []);
  useEffect(() => {
    if (!loading && userRole !== "system_admin") {
      navigate("/dashboard");
    }
  }, [loading, userRole, navigate]);
  
  // Handle URL query parameters (for email links)
  useEffect(() => {
    if (loading || userRole !== "system_admin") return;
    
    const schoolId = searchParams.get('id');
    const action = searchParams.get('action');
    const highlightId = searchParams.get('highlight');
    
    if (schoolId) {
      const id = parseInt(schoolId);
      
      // Handle approve action (auto-verify)
      if (action === 'approve') {
        handleVerifySchool(id);
        setHighlightedSchoolId(id);
        setTimeout(() => setHighlightedSchoolId(null), 5000);
        setSearchParams({});
        setTimeout(() => {
          const row = document.querySelector(`[data-school-id="${id}"]`);
          if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (action === 'deactivate') {
        // Handle deactivate action
        handleDeactivateSchool(id);
        setSearchParams({});
      } else {
        // No action - just open edit form
        supabase
          .from('schools')
          .select('*')
          .eq('id', id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setEditing(data as School);
              setShowForm(true);
            } else {
              toast({
                title: 'School not found',
                description: 'Could not find the requested school.',
                variant: 'destructive'
              });
            }
          });
        setSearchParams({});
      }
    } else if (highlightId) {
      const id = parseInt(highlightId);
      setHighlightedSchoolId(id);
      
      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedSchoolId(null);
      }, 5000);
      
      // Clear params
      setSearchParams({});
      
      // Scroll to the highlighted row (with a delay to allow render)
      setTimeout(() => {
        const row = document.querySelector(`[data-school-id="${id}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [loading, userRole, searchParams, setSearchParams, toast]);
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [highlightedSchoolId, setHighlightedSchoolId] = useState<number | null>(null);
  
  // Server-side paginated query with filtering
  const {
    data: queryResult,
    isLoading,
    error
  } = useQuery<{ data: School[], count: number }>({
    queryKey: ["schools", searchQuery, selectedState, verificationFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      // Only fetch if there's a search query (min 3 chars) or state filter or verification filter
      const hasSearch = searchQuery.trim().length >= 3;
      const hasStateFilter = selectedState !== "all";
      const hasVerificationFilter = verificationFilter !== "all";
      
      if (!hasSearch && !hasStateFilter && !hasVerificationFilter) {
        return { data: [], count: 0 };
      }

      // Build base queries for both data and count
      let dataQuery = supabase.from("schools").select("*");
      let countQuery = supabase.from("schools").select("*", { count: 'exact', head: true });
      
      // Apply state filter
      if (hasStateFilter) {
        dataQuery = dataQuery.eq("state", selectedState);
        countQuery = countQuery.eq("state", selectedState);
      }
      
      // Apply verification status filter
      if (hasVerificationFilter) {
        dataQuery = dataQuery.eq("verification_status", verificationFilter);
        countQuery = countQuery.eq("verification_status", verificationFilter);
      }
      
      // Apply search filter (min 3 characters)
      if (hasSearch) {
        const query = searchQuery.trim();
        const searchPattern = `%${query}%`;
        const searchCondition = `school_name.ilike.${searchPattern},city.ilike.${searchPattern},phone_number.ilike.${searchPattern}`;
        dataQuery = dataQuery.or(searchCondition);
        countQuery = countQuery.or(searchCondition);
      }
      
      // Get total count
      const { count } = await countQuery;
      
      // Apply pagination and ordering
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;
      dataQuery = dataQuery.range(startIndex, endIndex).order("school_name", { ascending: true });
      
      const { data, error } = await dataQuery;
      if (error) throw error;
      
      return { data: data as School[], count: count || 0 };
    },
    enabled: searchQuery.trim().length >= 3 || selectedState !== "all" || verificationFilter !== "all"
  });

  const data = queryResult?.data || [];
  const totalItems = queryResult?.count || 0;

  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  // Check if search/filter is active
  const isFilterActive = searchQuery.trim().length >= 3 || selectedState !== "all" || verificationFilter !== "all";

  // Reset to page 1 when search query or state filter or verification filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedState, verificationFilter]);

  // Reset to page 1 when changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if there aren't many
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };
  const handleVerifySchool = async (schoolId: number) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) throw error;
      
      toast({ title: 'School verified', description: 'School has been marked as verified.' });
      qc.invalidateQueries({ queryKey: ["schools"] });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to verify school.', variant: 'destructive' });
    }
  };

  const handleDeactivateSchool = async (schoolId: number) => {
    const reason = window.prompt('Enter reason for deactivation (optional):');
    
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          verification_status: 'deactivated',
          flagged_reason: reason || 'Deactivated by admin'
        })
        .eq('id', schoolId);

      if (error) throw error;
      
      toast({ title: 'School deactivated', description: 'School has been deactivated.' });
      qc.invalidateQueries({ queryKey: ["schools"] });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to deactivate school.', variant: 'destructive' });
    }
  };

  const handleReactivateSchool = async (schoolId: number) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          verification_status: 'unverified',
          flagged_reason: null
        })
        .eq('id', schoolId);

      if (error) throw error;
      
      toast({ title: 'School reactivated', description: 'School has been reactivated.' });
      qc.invalidateQueries({ queryKey: ["schools"] });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to reactivate school.', variant: 'destructive' });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const {
        error
      } = await supabase.from("schools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["schools"]
      });
      toast({
        title: "Deleted",
        description: "School has been deleted."
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message ?? "Failed to delete school.",
        variant: "destructive" as any
      });
    }
  });
  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (school: School) => {
    setEditing(school);
    setShowForm(true);
  };
  if (loading || userRole !== "system_admin") {
    return <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground">{loading ? "Loading..." : "Redirecting..."}</div>
          </CardContent>
        </Card>
      </main>;
  }
  return <>
      <Navbar />
      <main className="p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Manage Schools</h1>
            <p className="text-muted-foreground">System Administration</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Button>
        </header>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? "Edit School" : "Add School"}</CardTitle>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <SchoolForm initial={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <CardTitle>Schools</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, city, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All States" />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add School
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isFilterActive ? (
            <div className="py-12 text-center">
              <div className="mb-4">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Search to View Schools</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter at least 3 characters in the search box or select a state to filter and view schools.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-6 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading schools...
            </div>
          ) : error ? (
            <div className="text-destructive">Error loading schools</div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No schools found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                
                <TableHeader>
                  <TableRow>
                    
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden md:table-cell">State</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Dismissal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow 
                      key={s.id}
                      data-school-id={s.id}
                      className={highlightedSchoolId === s.id ? "bg-yellow-100 dark:bg-yellow-900/20 transition-colors duration-300" : ""}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{s.school_name || '—'}</span>
                          <span className="md:hidden text-xs text-muted-foreground">
                            {(s.city || s.state) ? `(${[s.city, s.state].filter(Boolean).join(', ')})` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.verification_status === 'verified' && (
                          <Badge variant="success">Verified</Badge>
                        )}
                        {s.verification_status === 'flagged' && (
                          <Badge variant="destructive">Flagged</Badge>
                        )}
                        {s.verification_status === 'unverified' && (
                          <Badge variant="warning">Unverified</Badge>
                        )}
                        {s.verification_status === 'deactivated' && (
                          <Badge variant="secondary">Deactivated</Badge>
                        )}
                        {!s.verification_status && (
                          <Badge variant="outline">Unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{s.city || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">{s.state || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{s.phone_number || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{s.dismissal_time ? format(new Date(`1970-01-01T${s.dismissal_time}`), "hh:mm a") : ''}</TableCell>
                      <TableCell className="text-right">
                        <div className="hidden lg:flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {s.verification_status === 'deactivated' ? (
                            <Button variant="outline" size="sm" onClick={() => handleReactivateSchool(s.id)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          ) : s.verification_status === 'verified' ? (
                            <Button variant="softDestructive" size="sm" onClick={() => handleDeactivateSchool(s.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="success" size="sm" onClick={() => handleVerifySchool(s.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="softDestructive" size="sm" onClick={() => handleDeactivateSchool(s.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="softDestructive" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="lg:hidden flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" aria-label={`Actions for ${s.school_name || 'school'}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[60] bg-background">
                              <DropdownMenuItem onClick={() => openEdit(s)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {s.verification_status === 'deactivated' ? (
                                <DropdownMenuItem onClick={() => handleReactivateSchool(s.id)}>
                                  <RefreshCw className="mr-2 h-4 w-4" /> Reactivate
                                </DropdownMenuItem>
                              ) : s.verification_status === 'verified' ? (
                                <DropdownMenuItem onClick={() => handleDeactivateSchool(s.id)}>
                                  <XCircle className="mr-2 h-4 w-4" /> Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => handleVerifySchool(s.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Verify School
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeactivateSchool(s.id)}>
                                    <XCircle className="mr-2 h-4 w-4" /> Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => deleteMutation.mutate(s.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalItems > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} schools
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">Per page:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                      <SelectTrigger id="items-per-page" className="w-[80px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60] bg-background">
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="75">75</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((page, idx) => (
                        <PaginationItem key={`${page}-${idx}`}>
                          {page === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
    </>;
}