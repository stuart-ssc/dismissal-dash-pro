import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";

interface AddPersonDialogProps {
  schoolId: number;
  onPersonAdded: () => void;
}

export const AddPersonDialog = ({ schoolId, onPersonAdded }: AddPersonDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personType, setPersonType] = useState<'teacher' | 'student' | 'school_admin'>('student');
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; class_name: string }>>([]);
  const [availableBuses, setAvailableBuses] = useState<Array<{ id: string; bus_number: string }>>([]);
  const [availableCarLines, setAvailableCarLines] = useState<Array<{ id: string; line_name: string }>>([]);
  const [availableWalkerLocations, setAvailableWalkerLocations] = useState<Array<{ id: string; location_name: string }>>([]);
  const [availableActivities, setAvailableActivities] = useState<Array<{ id: string; activity_name: string }>>([]);
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

  // Fetch classes when grade level changes
  useEffect(() => {
    const fetchClasses = async () => {
      if (formData.gradeLevel && personType === 'student') {
        const { data, error } = await supabase
          .from('classes')
          .select('id, class_name')
          .eq('school_id', schoolId)
          .eq('grade_level', formData.gradeLevel);
        
        if (!error && data) {
          setAvailableClasses(data);
        }
      } else {
        setAvailableClasses([]);
      }
    };

    fetchClasses();
  }, [formData.gradeLevel, personType, schoolId]);

  // Fetch transportation options when dialog opens or person type changes
  useEffect(() => {
    const fetchTransportationOptions = async () => {
      if (!open || personType !== 'student') return;
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
  }, [open, personType, schoolId]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      gradeLevel: '',
      classId: '',
      studentId: '',
      dismissalModeId: '',
      transportMethod: '',
      transportTargetId: '',
    });
    setPersonType('student');
    setAvailableClasses([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (personType === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            grade_level: formData.gradeLevel,
            student_id: formData.studentId || null,
            dismissal_mode_id: formData.dismissalModeId || null,
            school_id: schoolId
          })
          .select()
          .single();

        if (studentError) throw studentError;

        // If a class is selected, add the student to the class roster
        if (formData.classId && studentData) {
          const { error: rosterError } = await supabase
            .from('class_rosters')
            .insert({
              student_id: studentData.id,
              class_id: formData.classId
            });

          if (rosterError) throw rosterError;
        }

        // Save transportation assignment
        if (studentData) {
          // Clear existing assignments to keep a single method
          await supabase.from('student_bus_assignments').delete().eq('student_id', studentData.id);
          await supabase.from('student_walker_assignments').delete().eq('student_id', studentData.id);
          await supabase.from('student_car_assignments').delete().eq('student_id', studentData.id);
          await supabase.from('student_after_school_assignments').delete().eq('student_id', studentData.id);
          if (formData.transportMethod && formData.transportTargetId) {
            if (formData.transportMethod === 'bus') {
              const { error: insErr } = await supabase.from('student_bus_assignments').insert({ student_id: studentData.id, bus_id: formData.transportTargetId });
              if (insErr) throw insErr;
            } else if (formData.transportMethod === 'walker') {
              const { error: insErr } = await supabase.from('student_walker_assignments').insert({ student_id: studentData.id, walker_location_id: formData.transportTargetId });
              if (insErr) throw insErr;
            } else if (formData.transportMethod === 'car') {
              const { error: insErr } = await supabase.from('student_car_assignments').insert({ student_id: studentData.id, car_line_id: formData.transportTargetId });
              if (insErr) throw insErr;
            } else if (formData.transportMethod === 'activity') {
              const { error: insErr } = await supabase.from('student_after_school_assignments').insert({ student_id: studentData.id, after_school_activity_id: formData.transportTargetId });
              if (insErr) throw insErr;
            }
          }
        }
      } else if (personType === 'teacher') {
        const { error } = await supabase
          .from('teachers')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            school_id: schoolId
          });

        if (error) throw error;
      } else if (personType === 'school_admin') {
        // For school admins, we would need to create a user account and assign roles
        // This is more complex and would typically require an invitation system
        toast({
          title: "Feature Not Available",
          description: "Adding school administrators requires an invitation system. Please contact your system administrator.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Success",
        description: `${personType === 'student' ? 'Student' : 'Teacher'} added successfully.`
      });

      resetForm();
      setOpen(false);
      onPersonAdded();
    } catch (error) {
      console.error('Error adding person:', error);
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Add a new student, teacher, or administrator to your school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personType">Person Type</Label>
            <Select value={personType} onValueChange={(value: 'teacher' | 'student' | 'school_admin') => setPersonType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select person type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="school_admin">School Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {(personType === 'teacher' || personType === 'school_admin') && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          )}

          {personType === 'student' && (
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
                  <Label htmlFor="classId">Class *</Label>
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
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};