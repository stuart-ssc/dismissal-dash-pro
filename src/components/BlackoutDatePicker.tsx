import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { format, parse } from "date-fns";

interface BlackoutDatePickerProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
}

export function BlackoutDatePicker({ selectedDates, onDatesChange }: BlackoutDatePickerProps) {
  const [tempSelectedDates, setTempSelectedDates] = useState<Date[]>(
    selectedDates.map(d => parse(d, 'yyyy-MM-dd', new Date()))
  );

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    setTempSelectedDates(dates);
    const formattedDates = dates.map(d => format(d, 'yyyy-MM-dd'));
    onDatesChange(formattedDates);
  };

  const removeDate = (dateStr: string) => {
    const newDates = selectedDates.filter(d => d !== dateStr);
    onDatesChange(newDates);
    setTempSelectedDates(newDates.map(d => parse(d, 'yyyy-MM-dd', new Date())));
  };

  return (
    <div className="space-y-4">
      <Calendar
        mode="multiple"
        selected={tempSelectedDates}
        onSelect={handleDateSelect}
        className="rounded-md border"
        disabled={(date) => date < new Date()}
      />
      
      {selectedDates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Blackout Dates:</p>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map(date => (
              <Badge key={date} variant="secondary" className="flex items-center gap-1">
                {format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => removeDate(date)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}