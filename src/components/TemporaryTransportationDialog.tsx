import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Info } from "lucide-react";
import { format, addDays } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemporaryTransportationDialogProps {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    current_transportation?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  schoolId: number;
}

type OverrideType = 'single_date' | 'date_range' | 'recurring_weekday' | 'specific_dates';
type TransportType = 'bus' | 'car' | 'walker' | 'activity';

export function TemporaryTransportationDialog({
  student,
  open,
  onOpenChange,
  onSuccess,
  schoolId
}: TemporaryTransportationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [overrideType, setOverrideType] = useState<OverrideType>('single_date');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [weekdayPattern, setWeekdayPattern] = useState<number[]>([]);
  const [transportType, setTransportType] = useState<TransportType>('bus');
  const [selectedTransportId, setSelectedTransportId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Transport options
  const [buses, setBuses] = useState<any[]>([]);
  const [carLines, setCarLines] = useState<any[]>([]);
  const [walkerLocations, setWalkerLocations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const weekdays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  useEffect(() => {
    if (open) {
      fetchTransportOptions();
    }
  }, [open, schoolId]);

  const fetchTransportOptions = async () => {
    const [busesRes, carLinesRes, walkersRes, activitiesRes] = await Promise.all([
      supabase.from('buses').select('*').eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('car_lines').select('*').eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('walker_locations').select('*').eq('school_id', schoolId).eq('status', 'active'),
      supabase.from('activity_transport_options' as any).select('id, location, status, group_id, special_use_groups(id, name)').eq('school_id', schoolId).eq('status', 'active'),
    ]);

    if (busesRes.data) setBuses(busesRes.data);
    if (carLinesRes.data) setCarLines(carLinesRes.data);
    if (walkersRes.data) setWalkerLocations(walkersRes.data);
    if (activitiesRes.data) {
      // Map activity_transport_options to a friendly format
      const mapped = (activitiesRes.data as any[]).map((a: any) => ({
        id: a.id,
        activity_name: a.special_use_groups?.name || 'Unknown Group',
        location: a.location,
      }));
      setActivities(mapped);
    }
  };

  const toggleWeekday = (day: number) => {
    setWeekdayPattern(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!selectedTransportId) {
      toast({
        title: "Missing Information",
        description: "Please select a transportation option",
        variant: "destructive"
      });
      return;
    }

    if (overrideType === 'recurring_weekday' && weekdayPattern.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one weekday",
        variant: "destructive"
      });
      return;
    }

    if (overrideType === 'specific_dates' && specificDates.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one date",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        student_id: student.id,
        override_type: overrideType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        notes: notes || null,
        created_by: user.id,
      };

      // Set transportation ID based on type
      if (transportType === 'bus') insertData.bus_id = selectedTransportId;
      else if (transportType === 'car') insertData.car_line_id = selectedTransportId;
      else if (transportType === 'walker') insertData.walker_location_id = selectedTransportId;
      else if (transportType === 'activity') insertData.activity_transport_option_id = selectedTransportId;

      // Set date-related fields based on override type
      if (overrideType === 'date_range') {
        insertData.end_date = endDate ? format(endDate, 'yyyy-MM-dd') : null;
      } else if (overrideType === 'recurring_weekday') {
        insertData.end_date = endDate ? format(endDate, 'yyyy-MM-dd') : null;
        insertData.weekday_pattern = weekdayPattern;
      } else if (overrideType === 'specific_dates') {
        insertData.specific_dates = specificDates.map(d => format(d, 'yyyy-MM-dd'));
      }

      const { error } = await supabase
        .from('student_temporary_transportation')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Temporary transportation override created",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating temporary transportation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create temporary transportation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOverrideType('single_date');
    setStartDate(new Date());
    setEndDate(undefined);
    setSpecificDates([]);
    setWeekdayPattern([]);
    setTransportType('bus');
    setSelectedTransportId("");
    setNotes("");
  };

  const getTransportOptions = () => {
    switch (transportType) {
      case 'bus': return buses;
      case 'car': return carLines;
      case 'walker': return walkerLocations;
      case 'activity': return activities;
      default: return [];
    }
  };

  const getTransportLabel = (option: any) => {
    switch (transportType) {
      case 'bus': return `Bus ${option.bus_number} - ${option.driver_first_name} ${option.driver_last_name}`;
      case 'car': return `${option.line_name} (${option.color})`;
      case 'walker': return option.location_name;
      case 'activity': return option.activity_name;
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Temporary Transportation Override</DialogTitle>
          <DialogDescription>
            Create a temporary transportation assignment for {student.first_name} {student.last_name}
            {student.current_transportation && ` (Currently: ${student.current_transportation})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Override Type Selection */}
          <div className="space-y-3">
            <Label>Override Type</Label>
            <RadioGroup value={overrideType} onValueChange={(v) => setOverrideType(v as OverrideType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single_date" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">Single Date (e.g., today only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date_range" id="range" />
                <Label htmlFor="range" className="font-normal cursor-pointer">Date Range (e.g., March 1-15)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring_weekday" id="recurring" />
                <Label htmlFor="recurring" className="font-normal cursor-pointer">Recurring Weekday (e.g., Every Thursday)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific_dates" id="specific" />
                <Label htmlFor="specific" className="font-normal cursor-pointer">Specific Dates (e.g., March 5, 12, 19)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Selection Based on Override Type */}
          <div className="space-y-3">
            <Label>Date Selection</Label>
            
            {overrideType === 'single_date' && (
              <div className="flex gap-2">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  className="rounded-md border"
                />
                <div className="flex-1 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStartDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStartDate(addDays(new Date(), 1))}
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
            )}

            {overrideType === 'date_range' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Start Date</Label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">End Date</Label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-md border"
                  />
                </div>
              </div>
            )}

            {overrideType === 'recurring_weekday' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Start Date</Label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">End Date (Optional)</Label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Select Weekdays</Label>
                  <div className="flex gap-2 mt-2">
                    {weekdays.map((day) => (
                      <div key={day.value} className="flex flex-col items-center gap-1">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={weekdayPattern.includes(day.value)}
                          onCheckedChange={() => toggleWeekday(day.value)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-xs cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {overrideType === 'specific_dates' && (
              <Calendar
                mode="multiple"
                selected={specificDates}
                onSelect={(dates) => setSpecificDates(dates || [])}
                className="rounded-md border"
              />
            )}
          </div>

          {/* Transportation Type Selection */}
          <div className="space-y-3">
            <Label>Transportation Method</Label>
            <Select value={transportType} onValueChange={(v) => {
              setTransportType(v as TransportType);
              setSelectedTransportId("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="car">Car Rider</SelectItem>
                <SelectItem value="walker">Walker</SelectItem>
                <SelectItem value="activity">After School Activity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific Transport Selection */}
          <div className="space-y-3">
            <Label>Select {transportType === 'bus' ? 'Bus' : transportType === 'car' ? 'Car Line' : transportType === 'walker' ? 'Walker Location' : 'Activity'}</Label>
            <Select value={selectedTransportId} onValueChange={setSelectedTransportId}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {getTransportOptions().map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {getTransportLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedTransportId && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Preview:</strong> This will temporarily override transportation to{' '}
                <strong>
                  {getTransportLabel(getTransportOptions().find(o => o.id === selectedTransportId))}
                </strong>
                {' '}for the selected dates.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Temporary Assignment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
