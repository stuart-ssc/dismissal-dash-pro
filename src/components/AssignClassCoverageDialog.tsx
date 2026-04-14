import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AssignClassCoverageDialogProps {
  classId: string;
  className: string;
  availableTeachers: Teacher[];
  onCoverageAssigned?: () => void;
}

export function AssignClassCoverageDialog({
  classId,
  className,
  availableTeachers,
  onCoverageAssigned
}: AssignClassCoverageDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedTeacherId || selectedDates.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a teacher and at least one date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert coverage for each selected date
      const coverageRecords = selectedDates.map(date => ({
        class_id: classId,
        covering_teacher_id: selectedTeacherId,
        assigned_by: user.id,
        coverage_date: format(date, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
      }));

      const { error } = await supabase
        .from('class_coverage')
        .insert(coverageRecords);

      if (error) throw error;

      // Call edge function to send notification email
      const selectedTeacher = availableTeachers.find(t => t.id === selectedTeacherId);
      if (selectedTeacher) {
        await supabase.functions.invoke('send-coverage-notification', {
          body: {
            coveringTeacherId: selectedTeacherId,
            className,
            coverageDates: selectedDates.map(d => format(d, 'MMM d, yyyy')),
            notes: notes.trim() || null,
          }
        });
      }

      toast({
        title: "Coverage Assigned",
        description: `Successfully assigned coverage for ${selectedDates.length} day(s).`,
      });

      // Reset form
      setSelectedDates([]);
      setSelectedTeacherId("");
      setNotes("");
      setOpen(false);

      onCoverageAssigned?.();
    } catch (error: any) {
      console.error("Error assigning coverage:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign coverage",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const exists = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    if (exists) {
      setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const setToday = () => {
    const today = new Date();
    setSelectedDates([today]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Assign Coverage
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Dismissal Coverage</DialogTitle>
          <DialogDescription>
            Assign another teacher to cover dismissal for {className}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label>Covering Teacher</Label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher..." />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name} ({teacher.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Coverage Dates</Label>
              <Button variant="ghost" size="sm" onClick={setToday}>
                Just Today
              </Button>
            </div>
            <div className="border rounded-md p-3">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onDayClick={handleDayClick}
                className={cn("pointer-events-auto")}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
            {selectedDates.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedDates.map(d => format(d, 'MMM d, yyyy')).join(', ')}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions for the covering teacher..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Assigning..." : "Assign Coverage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
