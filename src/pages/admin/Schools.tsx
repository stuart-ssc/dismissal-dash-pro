import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

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
  const {
    data,
    isLoading,
    error
  } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("schools").select("*").order("id", {
        ascending: true
      });
      if (error) throw error;
      return data as School[];
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Schools</CardTitle>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-6 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading schools...
            </div> : error ? <div className="text-destructive">Error loading schools</div> : <div className="overflow-x-auto">
              <Table>
                
                <TableHeader>
                  <TableRow>
                    
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden md:table-cell">State</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Dismissal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{s.school_name || '—'}</span>
                          <span className="md:hidden text-xs text-muted-foreground">
                            {(s.city || s.state) ? `(${[s.city, s.state].filter(Boolean).join(', ')})` : ''}
                          </span>
                        </div>
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
            </div>}
        </CardContent>
      </Card>
    </main>
    </>;
}