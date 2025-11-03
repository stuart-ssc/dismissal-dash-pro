import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ViewTemporaryTransportationDialogProps {
  student: {
    id: string;
    first_name: string;
    last_name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ViewTemporaryTransportationDialog({
  student,
  open,
  onOpenChange,
  onEdit
}: ViewTemporaryTransportationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchOverrides();
    }
  }, [open, student.id]);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_temporary_transportation')
        .select(`
          *,
          buses (bus_number, driver_first_name, driver_last_name),
          car_lines (line_name, color),
          walker_locations (location_name),
          after_school_activities (activity_name)
        `)
        .eq('student_id', student.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setOverrides(data || []);
    } catch (error: any) {
      console.error('Error fetching overrides:', error);
      toast({
        title: "Error",
        description: "Failed to load temporary transportation overrides",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('student_temporary_transportation')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Temporary transportation override deleted",
      });

      fetchOverrides();
    } catch (error: any) {
      console.error('Error deleting override:', error);
      toast({
        title: "Error",
        description: "Failed to delete override",
        variant: "destructive"
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getTransportationLabel = (override: any) => {
    if (override.bus_id && override.buses) {
      return `Bus ${override.buses.bus_number}`;
    }
    if (override.car_line_id && override.car_lines) {
      return `${override.car_lines.line_name}`;
    }
    if (override.walker_location_id && override.walker_locations) {
      return `Walker - ${override.walker_locations.location_name}`;
    }
    if (override.after_school_activity_id && override.after_school_activities) {
      return override.after_school_activities.activity_name;
    }
    return "Unknown";
  };

  const getDateDescription = (override: any) => {
    if (override.override_type === 'single_date') {
      return format(new Date(override.start_date), 'MMM d, yyyy');
    }
    if (override.override_type === 'date_range') {
      return `${format(new Date(override.start_date), 'MMM d')} - ${format(new Date(override.end_date), 'MMM d, yyyy')}`;
    }
    if (override.override_type === 'recurring_weekday') {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = override.weekday_pattern?.map((d: number) => weekdays[d]).join(', ') || '';
      const endPart = override.end_date ? ` until ${format(new Date(override.end_date), 'MMM d, yyyy')}` : '';
      return `Every ${days}${endPart}`;
    }
    if (override.override_type === 'specific_dates') {
      return override.specific_dates?.map((d: string) => format(new Date(d), 'MMM d')).join(', ') || '';
    }
    return '';
  };

  const isActive = (override: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(override.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (override.override_type === 'single_date') {
      return startDate.getTime() >= today.getTime();
    }
    
    if (override.end_date) {
      const endDate = new Date(override.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() >= today.getTime();
    }
    
    return startDate.getTime() >= today.getTime();
  };

  const activeOverrides = overrides.filter(isActive);
  const expiredOverrides = overrides.filter(o => !isActive(o));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Temporary Transportation Overrides</DialogTitle>
            <DialogDescription>
              View and manage temporary transportation for {student.first_name} {student.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <>
                {/* Active Overrides */}
                {activeOverrides.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Active & Upcoming</h3>
                    {activeOverrides.map((override) => (
                      <div key={override.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="default">{getTransportationLabel(override)}</Badge>
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Temporary
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getDateDescription(override)}
                            </div>
                            {override.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">{override.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(override.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expired Overrides */}
                {expiredOverrides.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Past Overrides</h3>
                    {expiredOverrides.map((override) => (
                      <div key={override.id} className="border rounded-lg p-4 space-y-2 opacity-60">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">{getTransportationLabel(override)}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {getDateDescription(override)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(override.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {overrides.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No temporary transportation overrides found for this student.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                Add New Override
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Temporary Override?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this temporary transportation override. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
