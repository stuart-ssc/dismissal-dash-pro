import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'School Admin' | 'Teacher' | 'Student';
  grade?: string;
  classes: string[];
  studentId?: string;
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gradeLevel: '',
    classId: '',
    studentId: ''
  });
  const { toast } = useToast();

  // Update form data when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        email: person.email || '',
        gradeLevel: person.grade || '',
        classId: '', // Will be set after fetching current class
        studentId: person.studentId || ''
      });
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
            student_id: formData.studentId || null
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
      } else if (person.role === 'Teacher') {
        const { error } = await supabase
          .from('teachers')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email
          })
          .eq('id', person.id);

        if (error) throw error;
      } else if (person.role === 'School Admin') {
        // Update profile for school admin
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email
          })
          .eq('id', person.id);

        if (error) throw error;
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
      </DialogContent>
    </Dialog>
  );
};