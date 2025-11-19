import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, KeyRound, MoreVertical, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  school_id: number | null;
  created_at?: string | null;
}

interface UserRoleRow { user_id: string; role: 'teacher' | 'school_admin' | 'system_admin' | 'district_admin' }

interface School { id: number; school_name: string | null }

interface District { id: string; district_name: string }

interface UserDistrict { user_id: string; district_id: string }

const roleOptions: UserRoleRow["role"][] = ["teacher", "school_admin", "district_admin", "system_admin"];

const getRoleLabel = (r: UserRoleRow["role"]) =>
  r.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const schema = z.object({
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
  email: z.string().email(),
  role: z.enum(["teacher", "school_admin", "district_admin", "system_admin"]),
  school_id: z.union([z.coerce.number(), z.null()]).optional(),
  district_id: z.string().uuid().optional(),
}).superRefine((val, ctx) => {
  if ((val.role === 'teacher' || val.role === 'school_admin') && (!val.school_id && val.school_id !== 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'School is required for teacher or school admin', path: ['school_id'] });
  }
  if (val.role === 'district_admin' && !val.district_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'District is required for district admin', path: ['district_id'] });
  }
});

type FormValues = z.infer<typeof schema>;

export default function AdminUsers() {
  const { userRole, loading, session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Manage Users | System Administration";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create, edit, and delete users and roles. Associate users to schools.");
  }, []);

  useEffect(() => {
    if (!loading && userRole !== 'system_admin') {
      navigate('/dashboard');
    }
  }, [loading, userRole, navigate]);

  const { data: profiles, isLoading: loadingProfiles } = useQuery<ProfileRow[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,first_name,last_name,email,school_id,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    }
  });

  const { data: roles } = useQuery<UserRoleRow[]>({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data as UserRoleRow[];
    }
  });

  const { data: schools } = useQuery<School[]>({
    queryKey: ['schools-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('id, school_name').order('school_name');
      if (error) throw error;
      return data as School[];
    }
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ['districts-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('districts').select('id, district_name').order('district_name');
      if (error) throw error;
      return data as District[];
    }
  });

  const { data: userDistricts } = useQuery<UserDistrict[]>({
    queryKey: ['user_districts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_districts').select('user_id, district_id');
      if (error) throw error;
      return data as UserDistrict[];
    }
  });

  const byUserRole = useMemo(() => {
    const map = new Map<string, UserRoleRow["role"]>();
    (roles || []).forEach(r => map.set(r.user_id, r.role));
    return map;
  }, [roles]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [districtSearchOpen, setDistrictSearchOpen] = useState(false);
  const [districtSearchQuery, setDistrictSearchQuery] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', role: 'teacher', school_id: null, district_id: undefined }
  });

  const filteredDistricts = useMemo(() => {
    if (!districts) return [];
    if (!districtSearchQuery) return districts;
    
    const query = districtSearchQuery.toLowerCase();
    return districts.filter(d => 
      d.district_name.toLowerCase().includes(query)
    );
  }, [districts, districtSearchQuery]);

  useEffect(() => {
    if (editing) {
      const userRole = byUserRole.get(editing.id) || 'teacher';
      const userDistrictId = userDistricts?.find(ud => ud.user_id === editing.id)?.district_id;
      
      form.reset({
        first_name: editing.first_name || '',
        last_name: editing.last_name || '',
        email: editing.email || '',
        role: userRole,
        school_id: editing.school_id ?? null,
        district_id: userDistrictId,
      });
    } else {
      form.reset({ first_name: '', last_name: '', email: '', role: 'teacher', school_id: null, district_id: undefined });
    }
  }, [editing, byUserRole, userDistricts]);

  const filteredProfiles = useMemo(() => {
    const list = (profiles || []).filter(p => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [p.first_name, p.last_name, p.email].filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchesSchool = schoolFilter === 'all' || (p.school_id ?? -1) === Number(schoolFilter);
      return matchesSearch && matchesSchool;
    });
    return list;
  }, [profiles, search, schoolFilter]);

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: values.email,
          firstName: values.first_name,
          lastName: values.last_name,
          role: values.role,
          schoolId: (values.role === 'system_admin' || values.role === 'district_admin') ? null : values.school_id,
          districtId: values.role === 'district_admin' ? values.district_id : null,
          sendInvite: true,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      } as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['profiles'] }),
        qc.invalidateQueries({ queryKey: ['user_roles'] }),
      ]);
      toast({ title: 'User invited', description: 'Invitation email has been sent.' });
      setShowForm(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to create user.', variant: 'destructive' as any });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!editing) return;
      const profilePayload = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        school_id: (values.role === 'system_admin' || values.role === 'district_admin') ? null : (values.school_id ?? null),
      };
      const { error: upErr } = await supabase.from('profiles').update(profilePayload).eq('id', editing.id);
      if (upErr) throw upErr;
      
      // Reset role
      await supabase.from('user_roles').delete().eq('user_id', editing.id);
      const { error: insErr } = await supabase.from('user_roles').insert({ user_id: editing.id, role: values.role });
      if (insErr) throw insErr;

      // Handle district assignment for district_admin
      if (values.role === 'district_admin' && values.district_id) {
        await supabase.from('user_districts').delete().eq('user_id', editing.id);
        const { error: distErr } = await supabase.from('user_districts').insert({ 
          user_id: editing.id, 
          district_id: values.district_id,
          is_primary: true 
        });
        if (distErr) throw distErr;
      } else {
        // Remove district assignment if role changed from district_admin
        await supabase.from('user_districts').delete().eq('user_id', editing.id);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['profiles'] }),
        qc.invalidateQueries({ queryKey: ['user_roles'] }),
        qc.invalidateQueries({ queryKey: ['user_districts'] }),
      ]);
      toast({ title: 'Updated', description: 'User details have been updated.' });
      setShowForm(false);
      setEditing(null);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message || 'Failed to update user.', variant: 'destructive' as any })
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      } as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['profiles'] }),
        qc.invalidateQueries({ queryKey: ['user_roles'] }),
      ]);
      toast({ title: 'Deleted', description: 'User has been deleted.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message || 'Failed to delete user.', variant: 'destructive' as any })
  });

  const onSubmit = (values: FormValues) => {
    if (editing) updateMutation.mutate(values); else createMutation.mutate(values);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <Navbar />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage users, roles, and school assignments</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>{editing ? 'Edit User' : 'Create User'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); form.handleSubmit(onSubmit)(); }}>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" {...form.register('first_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" {...form.register('last_name')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={form.watch('role')} onValueChange={(v: any) => form.setValue('role', v, { shouldDirty: true })}>
                  <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent className="z-[60] bg-background">
                    {roleOptions.map(r => (<SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {(form.watch('role') === 'teacher' || form.watch('role') === 'school_admin') && (
                <div className="space-y-2">
                  <Label htmlFor="school_id">School</Label>
                  <Select value={(form.watch('school_id') ?? '').toString()} onValueChange={(v: any) => form.setValue('school_id', Number(v), { shouldDirty: true })}>
                    <SelectTrigger id="school_id"><SelectValue placeholder="Select a school" /></SelectTrigger>
                    <SelectContent className="z-[60] bg-background">
                      {(schools || []).map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.school_name || `School #${s.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.watch('role') === 'district_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="district_id">District</Label>
                  <Popover open={districtSearchOpen} onOpenChange={setDistrictSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={districtSearchOpen}
                        className="w-full justify-between"
                      >
                        {form.watch('district_id') 
                          ? districts?.find(d => d.id === form.watch('district_id'))?.district_name 
                          : "Select a district..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search districts..." 
                          value={districtSearchQuery}
                          onValueChange={setDistrictSearchQuery}
                        />
                        <CommandList>
                          {filteredDistricts.length === 0 && districtSearchQuery && (
                            <CommandEmpty>No districts found.</CommandEmpty>
                          )}
                          {filteredDistricts.length === 0 && !districtSearchQuery && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Type to search districts
                            </div>
                          )}
                          {filteredDistricts.length > 0 && (
                            <CommandGroup>
                              {filteredDistricts.map((district) => (
                                <CommandItem
                                  key={district.id}
                                  value={district.id}
                                  onSelect={() => {
                                    form.setValue('district_id', district.id, { shouldDirty: true });
                                    setDistrictSearchOpen(false);
                                    setDistrictSearchQuery("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.watch('district_id') === district.id 
                                        ? "opacity-100" 
                                        : "opacity-0"
                                    )}
                                  />
                                  {district.district_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.district_id && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.district_id.message}
                    </p>
                  )}
                </div>
              )}
              <div className="col-span-1 md:col-span-2 flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setDistrictSearchQuery(""); }}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Update' : 'Create & Invite'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>User Directory</CardTitle>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-64">
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={schoolFilter} onValueChange={(v) => setSchoolFilter(v)}>
                <SelectTrigger id="filter_school"><SelectValue placeholder="Filter by school" /></SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  <SelectItem value="all">All Schools</SelectItem>
                  {(schools || []).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.school_name || `School #${s.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">School/District</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((p) => {
                  const role = byUserRole.get(p.id) || '—';
                  const userDistrictId = userDistricts?.find(ud => ud.user_id === p.id)?.district_id;
                  const districtName = districts?.find(d => d.id === userDistrictId)?.district_name;
                  const schoolName = schools?.find(s => s.id === (p.school_id ?? -1))?.school_name || (p.school_id ? `#${p.school_id}` : '—');
                  const orgName = role === 'district_admin' && districtName ? districtName : schoolName;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{p.email || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{role === '—' ? '—' : getRoleLabel(role as UserRoleRow["role"])}</TableCell>
                      <TableCell className="hidden lg:table-cell">{orgName}</TableCell>
                      <TableCell className="text-right">
                        {/* Desktop actions */}
                        <div className="hidden lg:flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditing(p); setShowForm(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!p.email) {
                                toast({ title: 'No email on file', description: 'This user does not have an email address.', variant: 'destructive' as any });
                                return;
                              }
                              const redirectUrl = `${window.location.origin}/auth`;
                              const { error } = await supabase.auth.resetPasswordForEmail(p.email, { redirectTo: redirectUrl });
                              if (error) {
                                toast({ title: 'Failed to send reset', description: error.message, variant: 'destructive' as any });
                              } else {
                                toast({ title: 'Reset email sent', description: 'A password reset link has been sent to the user.' });
                              }
                            }}
                          >
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </Button>
                          <Button variant="softDestructive" size="sm" onClick={() => deleteMutation.mutate(p.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </div>

                        {/* Mobile actions */}
                        <div className="lg:hidden flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" aria-label={`Actions for ${[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'user'}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[60] bg-background">
                              <DropdownMenuItem onClick={() => { setEditing(p); setShowForm(true); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (!p.email) {
                                    toast({ title: 'No email on file', description: 'This user does not have an email address.', variant: 'destructive' as any });
                                    return;
                                  }
                                  const redirectUrl = `${window.location.origin}/auth`;
                                  const { error } = await supabase.auth.resetPasswordForEmail(p.email, { redirectTo: redirectUrl });
                                  if (error) {
                                    toast({ title: 'Failed to send reset', description: error.message, variant: 'destructive' as any });
                                  } else {
                                    toast({ title: 'Reset email sent', description: 'A password reset link has been sent to the user.' });
                                  }
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMutation.mutate(p.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {loadingProfiles && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
