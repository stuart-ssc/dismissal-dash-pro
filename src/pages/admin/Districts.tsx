import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, MoreVertical, Search, Filter, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu"
];

interface District {
  id: string;
  district_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  phone_number: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  allow_school_timezone_override: boolean;
  allow_school_dismissal_time_override: boolean;
  created_at?: string;
  updated_at?: string;
  schools_count?: number;
}

const districtSchema = z.object({
  district_name: z.string().min(1, "District name is required"),
  street_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipcode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid zipcode").optional().nullable().or(z.literal("")),
  phone_number: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  timezone: z.string().default("America/New_York"),
  allow_school_timezone_override: z.boolean().default(true),
  allow_school_dismissal_time_override: z.boolean().default(true),
});

type FormValues = z.infer<typeof districtSchema>;

function DistrictForm({
  initial,
  onClose
}: {
  initial?: Partial<District>;
  onClose: () => void;
}) {
  const isEdit = !!initial?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      district_name: initial?.district_name ?? "",
      street_address: initial?.street_address ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      zipcode: initial?.zipcode ?? "",
      phone_number: initial?.phone_number ?? "",
      email: initial?.email ?? "",
      website: initial?.website ?? "",
      timezone: initial?.timezone ?? "America/New_York",
      allow_school_timezone_override: initial?.allow_school_timezone_override ?? true,
      allow_school_dismissal_time_override: initial?.allow_school_dismissal_time_override ?? true,
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        district_name: values.district_name,
        street_address: values.street_address || null,
        city: values.city || null,
        state: values.state || null,
        zipcode: values.zipcode || null,
        phone_number: values.phone_number || null,
        email: values.email || null,
        website: values.website || null,
        timezone: values.timezone,
        allow_school_timezone_override: values.allow_school_timezone_override,
        allow_school_dismissal_time_override: values.allow_school_dismissal_time_override,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("districts")
          .update(payload)
          .eq("id", initial!.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("districts")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["districts"] });
      toast({
        title: "Saved",
        description: `District ${isEdit ? "updated" : "created"} successfully.`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    upsertMutation.mutate(values);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="district_name">District Name *</Label>
        <Input
          id="district_name"
          {...form.register("district_name")}
          placeholder="e.g., Springfield School District"
        />
        {form.formState.errors.district_name && (
          <p className="text-sm text-destructive">{form.formState.errors.district_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street_address">Street Address</Label>
          <Input id="street_address" {...form.register("street_address")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select
            value={form.watch("state") || ""}
            onValueChange={(value) => form.setValue("state", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipcode">Zip Code</Label>
          <Input id="zipcode" {...form.register("zipcode")} />
          {form.formState.errors.zipcode && (
            <p className="text-sm text-destructive">{form.formState.errors.zipcode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone</Label>
          <Input id="phone_number" {...form.register("phone_number")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" {...form.register("website")} placeholder="https://..." />
        {form.formState.errors.website && (
          <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          value={form.watch("timezone")}
          onValueChange={(value) => form.setValue("timezone", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {US_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">School Override Permissions</h4>
        <p className="text-sm text-muted-foreground">
          Allow individual schools to override district-wide settings
        </p>

        <div className="flex items-center justify-between">
          <Label htmlFor="allow_school_timezone_override">Allow Timezone Override</Label>
          <Switch
            id="allow_school_timezone_override"
            checked={!!form.watch("allow_school_timezone_override")}
            onCheckedChange={(v) => form.setValue("allow_school_timezone_override", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="allow_school_dismissal_time_override">Allow Dismissal Time Override</Label>
          <Switch
            id="allow_school_dismissal_time_override"
            checked={!!form.watch("allow_school_dismissal_time_override")}
            onCheckedChange={(v) => form.setValue("allow_school_dismissal_time_override", v)}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={upsertMutation.isPending}>
          {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Update" : "Create"} District
        </Button>
      </div>
    </form>
  );
}

const Districts = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<District | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const pageSize = 25;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && userRole !== 'system_admin') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  const { data: districts, isLoading } = useQuery({
    queryKey: ['districts', searchQuery, selectedState, page],
    queryFn: async () => {
      let query = supabase
        .from('districts')
        .select(`
          *,
          schools:schools(count)
        `, { count: 'exact' });

      if (searchQuery) {
        query = query.or(`district_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
      }

      if (selectedState !== 'all') {
        query = query.eq('state', selectedState);
      }

      query = query
        .order('district_name')
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const districtsWithCount = data?.map(d => ({
        ...d,
        schools_count: d.schools?.[0]?.count || 0
      })) || [];

      return { data: districtsWithCount, count: count || 0 };
    },
    enabled: !!user && userRole === 'system_admin',
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('districts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['districts'] });
      toast({
        title: "Deleted",
        description: "District deleted successfully."
      });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const totalPages = Math.ceil((districts?.count || 0) / pageSize);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'system_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            ← Back to Admin
          </Button>
          <h1 className="text-4xl font-bold mb-2">District Management</h1>
          <p className="text-muted-foreground">
            Manage districts and their district-wide settings
          </p>
        </div>

        {showForm && (
          <Card className="mb-6 shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>{editing ? "Edit District" : "Add District"}</CardTitle>
              <CardDescription>
                {editing ? "Update district information" : "Create a new district"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DistrictForm
                initial={editing ?? undefined}
                onClose={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
              <CardTitle>Districts</CardTitle>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add District
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 w-full">
              <div className="relative flex-1 sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, city, or state..."
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
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isMobile ? (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : districts?.data && districts.data.length > 0 ? (
                  districts.data.map((district) => (
                    <Card key={district.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                              {district.district_name}
                              {district.state && (
                                <span className="text-muted-foreground ml-2">
                                  ({district.state})
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {district.city && district.state && `${district.city}, ${district.state}`}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(district);
                                  setShowForm(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(district.id)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {district.email && (
                            <div>
                              <span className="text-muted-foreground">Email:</span>{" "}
                              {district.email}
                            </div>
                          )}
                          {district.phone_number && (
                            <div>
                              <span className="text-muted-foreground">Phone:</span>{" "}
                              {district.phone_number}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Timezone:</span>{" "}
                            {district.timezone}
                          </div>
                          <div>
                            <Badge variant="secondary">
                              {district.schools_count} school{district.schools_count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No districts found
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>District Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Schools</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : districts?.data && districts.data.length > 0 ? (
                    districts.data.map((district) => (
                      <TableRow key={district.id}>
                        <TableCell>
                          <div className="font-medium">
                            {district.district_name}
                            {district.state && (
                              <span className="text-muted-foreground ml-2">
                                ({district.state})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {district.city && district.state
                            ? `${district.city}, ${district.state} ${district.zipcode || ''}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {district.phone_number && <div>{district.phone_number}</div>}
                            {district.email && <div className="text-muted-foreground">{district.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>{district.timezone}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {district.schools_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(district);
                                  setShowForm(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(district.id)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No districts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, districts?.count || 0)} of {districts?.count || 0} districts
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={cn(page === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={cn(page === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditing(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit District" : "Add District"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update district information" : "Create a new district"}
            </DialogDescription>
          </DialogHeader>
          <DistrictForm
            initial={editing ?? undefined}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete District</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this district? This action cannot be undone.
              Schools assigned to this district will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Districts;
