import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmailChangeDialog } from "@/components/EmailChangeDialog";
import { Mail, AlertCircle } from "lucide-react";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'School Admin' | 'Teacher' | 'Student';
  grade?: string;
  classes: string[];
  studentId?: string;
  dismissalModeId?: string;
}

interface EditPersonDialogProps {
  person: PersonData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
  onPersonUpdated: () => void;
}

export const EditPersonDialog = ({ person, open, onOpenChange, schoolId, onPersonUpdated }: EditPersonDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; class_name: string }>>([]);
  const [availableBuses, setAvailableBuses] = useState<Array<{ id: string; bus_number: string }>>([]);
  const [availableCarLines, setAvailableCarLines] = useState<Array<{ id: string; line_name: string }>>([]);
  const [availableWalkerLocations, setAvailableWalkerLocations] = useState<Array<{ id: string; location_name: string }>>([]);
  const [availableActivities, setAvailableActivities] = useState<Array<{ id: string; activity_name: string }>>([]);
  const [showEmailChangeDialog, setShowEmailChangeDialog] = useState(false);
  const [dbRole, setDbRole] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gradeLevel: '',
    classId: '',
    studentId: '',
    dismissalModeId: '',
    transportMethod: '', // 'bus' | 'walker' | 'car' | 'activity'
    transportTargetId: '',
  });
  const { toast } = useToast();

  // Load current DB role and account status for staff
  useEffect(() => {
    const loadRoleAndAccountStatus = async () => {
      if (!open || !person || person.role === 'Student') {
        setDbRole('');
        setSelectedRole('');
        setHasAccount(null);
        return;
      }

      // Check if they have a profiles record (i.e., have an account)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', person.id)
        .maybeSingle();

      setHasAccount(!!profile);

      // Load actual role from user_roles table
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', person.id);

      if (roles && roles.length > 0) {
        // Pick highest priority role
        const roleMap: Record<string, number> = { system_admin: 1, district_admin: 2, school_admin: 3, teacher: 4 };
        const sorted = roles.sort((a, b) => (roleMap[a.role] || 99) - (roleMap[b.role] || 99));
        setDbRole(sorted[0].role);
        setSelectedRole(sorted[0].role);
      } else {
        // No role in DB, infer from display role
        const inferredRole = person.role === 'School Admin' ? 'school_admin' : 'teacher';
        setDbRole(inferredRole);
        setSelectedRole(inferredRole);
      }
    };
    loadRoleAndAccountStatus();
  }, [open, person]);

  // Update form data when person changes
  useEffect(() => {
    if (person) {
      setFormData((prev) => ({
        ...prev,
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        email: person.email || '',
        gradeLevel: person.grade || '',
        classId: '', // Will be set after fetching current class
        studentId: person.studentId || '',
        dismissalModeId: person.dismissalModeId || ''
      }));
    }
  }, [person]);

  // Fetch classes when grade level changes (for students)
  useEffect(() => {
    const fetchClasses = async () => {
      if (formData.gradeLevel && person?.role === 'Student') {
        const { data, error } = await supabase
          .from('classes')
          .select('id, class_name')
          .eq('school_id', schoolId)
          .eq('grade_level', formData.gradeLevel);
        
        if (!error && data) {
          setAvailableClasses(data);
          
          // Set current class if student has one
          if (person.classes.length > 0) {
            const currentClass = data.find(c => c.class_name === person.classes[0]);
            if (currentClass) {
              setFormData(prev => ({ ...prev, classId: currentClass.id }));
            }
          }
        }
      } else {
        setAvailableClasses([]);
      }
    };

    fetchClasses();
  }, [formData.gradeLevel, person, schoolId]);

  // Fetch transportation options when dialog opens for students
  useEffect(() => {
    const fetchTransportationOptions = async () => {
      if (!open || person?.role !== 'Student') return;
      const [{ data: buses }, { data: carLines }, { data: walkerLocs }, { data: activities }] = await Promise.all([
        supabase.from('buses').select('id, bus_number').eq('school_id', schoolId).order('bus_number', { ascending: true }),
        supabase.from('car_lines').select('id, line_name').eq('school_id', schoolId).order('line_name', { ascending: true }),
        supabase.from('walker_locations').select('id, location_name').eq('school_id', schoolId).order('location_name', { ascending: true }),
        supabase.from('after_school_activities').select('id, activity_name').eq('school_id', schoolId).order('activity_name', { ascending: true })
      ]);
      setAvailableBuses(buses || []);
      setAvailableCarLines(carLines || []);
      setAvailableWalkerLocations(walkerLocs || []);
      setAvailableActivities(activities || []);
    };
    fetchTransportationOptions();
  }, [open, person, schoolId]);

  // Load existing transportation assignment for this student
  useEffect(() => {
    const loadTransportation = async () => {
      if (!open || !person || person.role !== 'Student') return;
      const studentUuid = person.id;
      const [busRes, walkerRes, carRes, activityRes] = await Promise.all([
        supabase.from('student_bus_assignments').select('bus_id').eq('student_id', studentUuid).maybeSingle(),
        supabase.from('student_walker_assignments').select('walker_location_id').eq('student_id', studentUuid).maybeSingle(),
        supabase.from('student_car_assignments').select('car_line_id').eq('student_id', studentUuid).maybeSingle(),
        supabase.from('student_after_school_assignments').select('after_school_activity_id').eq('student_id', studentUuid).maybeSingle(),
      ]);

      const busAssign = busRes.data;
      const walkerAssign = walkerRes.data;
      const carAssign = carRes.data;
      const activityAssign = activityRes.data;

      if (busAssign) {
        setFormData((prev) => ({ ...prev, transportMethod: 'bus', transportTargetId: busAssign.bus_id }));
      } else if (walkerAssign) {
        setFormData((prev) => ({ ...prev, transportMethod: 'walker', transportTargetId: walkerAssign.walker_location_id }));
      } else if (carAssign) {
        setFormData((prev) => ({ ...prev, transportMethod: 'car', transportTargetId: carAssign.car_line_id }));
      } else if (activityAssign) {
        setFormData((prev) => ({ ...prev, transportMethod: 'activity', transportTargetId: activityAssign.after_school_activity_id }));
      } else {
        setFormData((prev) => ({ ...prev, transportMethod: '', transportTargetId: '' }));
      }
    };
    loadTransportation();
  }, [open, person]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    
    setIsSubmitting(true);

    try {
      if (person.role === 'Student') {
        // Update student data
        const { error: studentError } = await supabase
          .from('students')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            grade_level: formData.gradeLevel,
            student_id: formData.studentId || null,
            dismissal_mode_id: formData.dismissalModeId || null
          })
          .eq('id', person.id);

        if (studentError) throw studentError;

        // Update class roster if class changed
        if (formData.classId) {
          // Remove from current class rosters
          await supabase
            .from('class_rosters')
            .delete()
            .eq('student_id', person.id);

          // Add to new class
          const { error: rosterError } = await supabase
            .from('class_rosters')
            .insert({
              student_id: person.id,
              class_id: formData.classId
            });

          if (rosterError) throw rosterError;
        }

        // Update transportation assignment
        // Clear existing assignments to enforce a single method
        await supabase.from('student_bus_assignments').delete().eq('student_id', person.id);
        await supabase.from('student_walker_assignments').delete().eq('student_id', person.id);
        await supabase.from('student_car_assignments').delete().eq('student_id', person.id);
        await supabase.from('student_after_school_assignments').delete().eq('student_id', person.id);

        if (formData.transportMethod && formData.transportTargetId) {
          if (formData.transportMethod === 'bus') {
            const { error: insErr } = await supabase
              .from('student_bus_assignments')
              .insert({ student_id: person.id, bus_id: formData.transportTargetId });
            if (insErr) throw insErr;
          } else if (formData.transportMethod === 'walker') {
            const { error: insErr } = await supabase
              .from('student_walker_assignments')
              .insert({ student_id: person.id, walker_location_id: formData.transportTargetId });
            if (insErr) throw insErr;
          } else if (formData.transportMethod === 'car') {
            const { error: insErr } = await supabase
              .from('student_car_assignments')
              .insert({ student_id: person.id, car_line_id: formData.transportTargetId });
            if (insErr) throw insErr;
          } else if (formData.transportMethod === 'activity') {
            const { error: insErr } = await supabase
              .from('student_after_school_assignments')
              .insert({ student_id: person.id, after_school_activity_id: formData.transportTargetId });
            if (insErr) throw insErr;
          }
        }
      } else if (person.role === 'Teacher' || person.role === 'School Admin') {
        // Update teacher record
        const { error } = await supabase
          .from('teachers')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email
          })
          .eq('id', person.id);

        if (error) throw error;

        // Also update profiles if they have an account
        if (hasAccount) {
          await supabase
            .from('profiles')
            .update({
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email
            })
            .eq('id', person.id);
        }

        // Handle role change if different from DB role
        if (selectedRole && selectedRole !== dbRole && hasAccount) {
          // Delete old role
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', person.id)
            .eq('role', dbRole as any);

          // Insert new role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: person.id,
              role: selectedRole as any
            });

          if (roleError) throw roleError;
        }
      }

      toast({
        title: "Success",
        description: `${person.role} updated successfully.`
      });

      onOpenChange(false);
      onPersonUpdated();
    } catch (error) {
      console.error('Error updating person:', error);
      toast({
        title: "Error",
        description: "Failed to update person. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {person.role}</DialogTitle>
          <DialogDescription>
            Update {person.firstName} {person.lastName}'s information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          {(person.role === 'Teacher' || person.role === 'School Admin') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Email *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailChangeDialog(true)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Mail className="h-3 w-3" />
                  Change Email
                </Button>
              </div>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Use "Change Email" button for secure email updates that sync with authentication.
              </p>
            </div>
          )}

          {(person.role === 'Teacher' || person.role === 'School Admin') && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              {hasAccount === false ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>This person must complete their account setup before their role can be changed.</span>
                </div>
              ) : (
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {person.role === 'Student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
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

              {formData.gradeLevel && availableClasses.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="classId">Class</Label>
                  <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
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
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Optional student ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dismissalModeId">Dismissal Mode ID</Label>
                <Input
                  id="dismissalModeId"
                  value={formData.dismissalModeId || ''}
                  onChange={(e) => setFormData({ ...formData, dismissalModeId: e.target.value })}
                  placeholder="e.g., 247, A-42"
                />
                <p className="text-xs text-muted-foreground">
                  Quick lookup number for car tags/dismissal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportMethod">Transportation</Label>
                <Select
                  value={formData.transportMethod}
                  onValueChange={(value) => setFormData({ ...formData, transportMethod: value, transportTargetId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="walker">Walker</SelectItem>
                    <SelectItem value="car">Car Rider</SelectItem>
                    <SelectItem value="activity">After School Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.transportMethod === 'bus' && (
                <div className="space-y-2">
                  <Label htmlFor="transportTargetId">Bus</Label>
                  <Select
                    value={formData.transportTargetId}
                    onValueChange={(value) => setFormData({ ...formData, transportTargetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bus" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {availableBuses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.bus_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.transportMethod === 'walker' && (
                <div className="space-y-2">
                  <Label htmlFor="transportTargetId">Walker Location</Label>
                  <Select
                    value={formData.transportTargetId}
                    onValueChange={(value) => setFormData({ ...formData, transportTargetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {availableWalkerLocations.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.location_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.transportMethod === 'car' && (
                <div className="space-y-2">
                  <Label htmlFor="transportTargetId">Car Line</Label>
                  <Select
                    value={formData.transportTargetId}
                    onValueChange={(value) => setFormData({ ...formData, transportTargetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select car line" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {availableCarLines.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.line_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.transportMethod === 'activity' && (
                <div className="space-y-2">
                  <Label htmlFor="transportTargetId">After School Activity</Label>
                  <Select
                    value={formData.transportTargetId}
                    onValueChange={(value) => setFormData({ ...formData, transportTargetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {availableActivities.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.activity_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Person'}
            </Button>
          </DialogFooter>
        </form>

        {/* Email Change Dialog */}
        {person && (person.role === 'Teacher' || person.role === 'School Admin') && (
          <EmailChangeDialog
            open={showEmailChangeDialog}
            onOpenChange={setShowEmailChangeDialog}
            userId={person.id}
            currentEmail={person.email || ''}
            userName={`${person.firstName} ${person.lastName}`}
            userType={person.role === 'Teacher' ? 'pending_teacher' : 'completed_account'}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};