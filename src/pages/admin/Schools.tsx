import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

// Types matching public.schools table (simplified)
interface School {
  id: number;
  school_name: string | null;
  address: string | null;
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
  address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  school_logo: z.string().url().optional().nullable(),
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
      address: initial?.address ?? "",
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
  return <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={form.handleSubmit(values => upsertMutation.mutate(values))}>

      <div className="space-y-2">
        <Label htmlFor="school_name">Name</Label>
        <Input id="school_name" {...form.register("school_name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...form.register("address")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone</Label>
        <Input id="phone_number" {...form.register("phone_number")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="school_logo">Logo URL</Label>
        <Input id="school_logo" {...form.register("school_logo")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="primary_color">Primary Color</Label>
        <Input id="primary_color" {...form.register("primary_color")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="secondary_color">Secondary Color</Label>
        <Input id="secondary_color" {...form.register("secondary_color")} />
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
  const [dialogOpen, setDialogOpen] = useState(false);
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
    setDialogOpen(true);
  };
  const openEdit = (school: School) => {
    setEditing(school);
    setDialogOpen(true);
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Schools</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing ? `Edit School #${editing.id}` : "Add School"}</DialogTitle>
              </DialogHeader>
              <SchoolForm initial={editing ?? undefined} onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-6 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading schools...
            </div> : error ? <div className="text-destructive">Error loading schools</div> : <div className="overflow-x-auto">
              <Table>
                
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">ID</TableHead>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Dismissal</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead>Audit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map(s => <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.id}</TableCell>
                      <TableCell>{s.school_name}</TableCell>
                      <TableCell>{s.phone_number}</TableCell>
                      <TableCell>{s.dismissal_time?.slice(0, 5)}</TableCell>
                      <TableCell>{s.email_notifications_enabled ? "On" : "Off"}</TableCell>
                      <TableCell>{s.sms_notifications_enabled ? "On" : "Off"}</TableCell>
                      <TableCell>{s.two_factor_required ? "On" : "Off"}</TableCell>
                      <TableCell>{s.audit_logs_enabled ? "On" : "Off"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="softDestructive" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>
    </main>
    </>;
}