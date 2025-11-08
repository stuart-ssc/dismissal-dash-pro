import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ScheduleRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any | null;
  onSuccess: () => void;
};

type Bus = {
  id: string;
  bus_number: string;
};

export function ScheduleRunDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ScheduleRunDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedBus, setSelectedBus] = useState<string>("");

  useEffect(() => {
    if (open && user) {
      loadBuses();
    }
  }, [open, user]);

  const loadBuses = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_number")
        .eq("school_id", profile?.school_id)
        .eq("status", "active")
        .order("bus_number");

      if (error) throw error;
      setBuses(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load buses");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !group || !selectedDate || !selectedBus) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) throw new Error("School not found");

      // Create run
      const { data: run, error: runError } = await supabase
        .from("special_use_runs")
        .insert({
          school_id: profile.school_id,
          group_id: group.id,
          run_name: `${group.name} - ${format(selectedDate, "MMM d, yyyy")}`,
          run_date: format(selectedDate, "yyyy-MM-dd"),
          status: "scheduled",
          created_by: user.id,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Assign bus
      const { error: busError } = await supabase
        .from("special_use_run_buses")
        .insert({
          run_id: run.id,
          bus_id: selectedBus,
        });

      if (busError) throw busError;

      // Assign current user as manager
      const { error: managerError } = await supabase
        .from("special_use_run_managers")
        .insert({
          run_id: run.id,
          manager_id: user.id,
          assigned_by: user.id,
        });

      if (managerError) throw managerError;

      toast.success("Run scheduled successfully");
      onSuccess();
      navigate("/admin/special-use-runs");
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule run");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quick Schedule Run</DialogTitle>
            <DialogDescription>
              Schedule a run for {group?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Bus</Label>
              <Select value={selectedBus} onValueChange={setSelectedBus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      Bus {bus.bus_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedDate || !selectedBus}>
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
