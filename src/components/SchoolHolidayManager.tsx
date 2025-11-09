import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { format, parse } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  is_recurring: boolean;
}

interface SchoolHolidayManagerProps {
  schoolId: number;
}

export function SchoolHolidayManager({ schoolId }: SchoolHolidayManagerProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [schoolId]);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('school_holidays' as any)
        .select('*')
        .eq('school_id', schoolId)
        .order('holiday_date', { ascending: true }) as any;

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayName || !holidayDate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('school_holidays' as any)
        .insert({
          school_id: schoolId,
          holiday_name: holidayName,
          holiday_date: holidayDate,
          is_recurring: isRecurring,
        }) as any;

      if (error) throw error;

      toast.success('Holiday added successfully');
      setShowAddDialog(false);
      resetForm();
      fetchHolidays();
    } catch (error: any) {
      console.error('Error adding holiday:', error);
      toast.error(error.message || 'Failed to add holiday');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase
        .from('school_holidays' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast.error(error.message || 'Failed to delete holiday');
    }
  };

  const resetForm = () => {
    setHolidayName('');
    setHolidayDate('');
    setIsRecurring(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>School Holidays</CardTitle>
              <CardDescription>
                Manage holidays when syncs should not occur
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No holidays configured. Add holidays to prevent syncs on specific dates.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.holiday_name}</TableCell>
                    <TableCell>
                      {format(parse(holiday.holiday_date, 'yyyy-MM-dd', new Date()), 'PPP')}
                    </TableCell>
                    <TableCell>
                      {holiday.is_recurring ? 'Recurring (Annual)' : 'One-time'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Holiday</DialogTitle>
            <DialogDescription>
              Add a holiday date when Infinite Campus syncs should not occur
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input
                id="name"
                placeholder="e.g., Winter Break"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Recurring (Annual)</Label>
                <p className="text-sm text-muted-foreground">
                  This holiday repeats every year on the same date
                </p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddHoliday} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}