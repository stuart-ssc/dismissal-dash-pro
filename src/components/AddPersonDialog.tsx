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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gradeLevel: '',
    classId: '',
    studentId: ''
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

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      gradeLevel: '',
      classId: '',
      studentId: ''
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