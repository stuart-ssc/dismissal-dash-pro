import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type SpecialUseRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: any | null;
  onSuccess: () => void;
  preselectedGroupId?: string;
};

type Group = {
  id: string;
  name: string;
};

type Bus = {
  id: string;
  bus_number: string;
};

export function SpecialUseRunDialog({
  open,
  onOpenChange,
  run,
  onSuccess,
  preselectedGroupId,
}: SpecialUseRunDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [formData, setFormData] = useState({
    run_name: "",
    group_id: "",
    run_date: new Date(),
    scheduled_departure_time: "",
    scheduled_return_time: "",
    notes: "",
  });
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  useEffect(() => {
    if (run) {
      setFormData({
        run_name: run.run_name || "",
        group_id: run.group_id || "",
        run_date: new Date(run.run_date),
        scheduled_departure_time: run.scheduled_departure_time || "",
        scheduled_return_time: run.scheduled_return_time || "",
        notes: run.notes || "",
      });
    } else {
      setFormData({
        run_name: "",
        group_id: preselectedGroupId || "",
        run_date: new Date(),
        scheduled_departure_time: "",
        scheduled_return_time: "",
        notes: "",
      });
      setSelectedBuses([]);
    }
  }, [run, open]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      const [groupsRes, busesRes] = await Promise.all([
        supabase
          .from("special_use_groups")
          .select("id, name")
          .eq("school_id", profile?.school_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("buses")
          .select("id, bus_number")
          .eq("school_id", profile?.school_id)
          .eq("status", "active")
          .order("bus_number"),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (busesRes.error) throw busesRes.error;

      setGroups(groupsRes.data || []);
      setBuses(busesRes.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile?.school_id) throw new Error("School not found");

      if (run) {
        // Update existing run
        const { error } = await supabase
          .from("special_use_runs")
          .update({
            run_name: formData.run_name,
            group_id: formData.group_id,
            run_date: format(formData.run_date, "yyyy-MM-dd"),
            scheduled_departure_time: formData.scheduled_departure_time || null,
            scheduled_return_time: formData.scheduled_return_time || null,
            notes: formData.notes || null,
          })
          .eq("id", run.id);

        if (error) throw error;
        toast.success("Run updated successfully");
      } else {
        // Create new run
        const { data: newRun, error: runError } = await supabase
          .from("special_use_runs")
          .insert({
            school_id: profile.school_id,
            group_id: formData.group_id,
            run_name: formData.run_name,
            run_date: format(formData.run_date, "yyyy-MM-dd"),
            scheduled_departure_time: formData.scheduled_departure_time || null,
            scheduled_return_time: formData.scheduled_return_time || null,
            notes: formData.notes || null,
            status: "scheduled",
            created_by: user.id,
          })
          .select()
          .single();

        if (runError) throw runError;

        // Assign buses
        if (selectedBuses.length > 0) {
          const { error: busError } = await supabase
            .from("special_use_run_buses")
            .insert(
              selectedBuses.map(busId => ({
                run_id: newRun.id,
                bus_id: busId,
              }))
            );

          if (busError) throw busError;
        }

        // Assign current user as manager
        const { error: managerError } = await supabase
          .from("special_use_run_managers")
          .insert({
            run_id: newRun.id,
            manager_id: user.id,
            assigned_by: user.id,
          });

        if (managerError) throw managerError;

        toast.success("Run created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save run");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{run ? "Edit Run" : "Schedule New Run"}</DialogTitle>
            <DialogDescription>
              {run ? "Update run details" : "Create a new special use run"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="run_name">Run Name</Label>
              <Input
                id="run_name"
                value={formData.run_name}
                onChange={(e) => setFormData({ ...formData, run_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group_id">Group</Label>
              <Select
                value={formData.group_id}
                onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                disabled={!!preselectedGroupId && !run}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Run Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.run_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.run_date ? format(formData.run_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.run_date}
                    onSelect={(date) => date && setFormData({ ...formData, run_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="departure">Departure Time</Label>
                <Input
                  id="departure"
                  type="time"
                  value={formData.scheduled_departure_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_departure_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="return">Return Time</Label>
                <Input
                  id="return"
                  type="time"
                  value={formData.scheduled_return_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_return_time: e.target.value })}
                />
              </div>
            </div>
            {!run && (
              <div className="grid gap-2">
                <Label>Buses</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {buses.map((bus) => (
                    <label key={bus.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBuses.includes(bus.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBuses([...selectedBuses, bus.id]);
                          } else {
                            setSelectedBuses(selectedBuses.filter(id => id !== bus.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span>Bus {bus.bus_number}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
