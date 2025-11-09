import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, Archive, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface TeachersWithoutClassesAlertProps {
  schoolId: number;
}

export const TeachersWithoutClassesAlert = ({ schoolId }: TeachersWithoutClassesAlertProps) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed teachers from localStorage
    const stored = localStorage.getItem('dismissed_teachers_without_classes');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
    fetchTeachersWithoutClasses();
  }, [schoolId]);

  const fetchTeachersWithoutClasses = async () => {
    try {
      const { data: allTeachers, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId)
        .eq('archived', false);

      if (error) throw error;

      // Filter out teachers who have classes
      const teachersWithoutClasses = [];
      for (const teacher of allTeachers || []) {
        const { count } = await supabase
          .from('class_teachers')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', teacher.id);

        if (count === 0) {
          teachersWithoutClasses.push(teacher);
        }
      }

      setTeachers(teachersWithoutClasses);
    } catch (error) {
      console.error('Error fetching teachers without classes:', error);
    }
  };

  const handleDismiss = (teacherId: string) => {
    const newDismissed = [...dismissed, teacherId];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_teachers_without_classes', JSON.stringify(newDismissed));
  };

  const handleDismissAll = () => {
    const allIds = teachers.map(t => t.id);
    setDismissed(allIds);
    localStorage.setItem('dismissed_teachers_without_classes', JSON.stringify(allIds));
  };

  const handleArchive = async (teacherId: string, firstName: string, lastName: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: 'Not assigned to any classes',
        })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success(`${firstName} ${lastName} archived successfully`);
      fetchTeachersWithoutClasses();
    } catch (error) {
      console.error('Error archiving teacher:', error);
      toast.error('Failed to archive teacher');
    }
  };

  const visibleTeachers = teachers.filter(t => !dismissed.includes(t.id));

  if (visibleTeachers.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle>Teachers Without Classes</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          {visibleTeachers.length} teacher(s) are not assigned to any classes. This may indicate they need to be archived or assigned to classes.
        </p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                {isOpen ? 'Hide' : 'Show'} Teachers
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="sm" onClick={handleDismissAll}>
              Dismiss All
            </Button>
          </div>
          <CollapsibleContent className="space-y-2 mt-4">
            {visibleTeachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                  <Link to={`/dashboard/people?search=${teacher.email}`} className="font-medium hover:underline">
                    {teacher.first_name} {teacher.last_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(teacher.id)}
                  >
                    <X className="h-4 w-4" />
                    Keep
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(teacher.id, teacher.first_name, teacher.last_name)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
};
