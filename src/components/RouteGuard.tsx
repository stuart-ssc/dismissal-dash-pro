import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTodayDismissalRun } from "@/hooks/useTodayDismissalRun";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  mode: "bus" | "car-line" | "walker" | "classroom";
}

export function RouteGuard({ children, mode }: RouteGuardProps) {
  const { run, isLoading } = useTodayDismissalRun();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading || !run) return;

    // Check if the specific mode is completed
    if (mode === "bus" && run.bus_completed) {
      toast({
        title: "Access Denied",
        description: "Bus dismissal has already been completed for today.",
        variant: "destructive",
      });
      navigate("/dashboard/dismissal", { replace: true });
      return;
    }

    if (mode === "car-line" && run.car_line_completed) {
      toast({
        title: "Access Denied",
        description: "Car line dismissal has already been completed for today.",
        variant: "destructive",
      });
      navigate("/dashboard/dismissal", { replace: true });
      return;
    }

    if (mode === "walker" && run.walker_completed) {
      toast({
        title: "Access Denied",
        description: "Walker dismissal has already been completed for today.",
        variant: "destructive",
      });
      navigate("/dashboard/dismissal", { replace: true });
      return;
    }

    if (mode === "classroom" && run.status === "completed") {
      toast({
        title: "Access Denied",
        description: "Today's dismissal has already been completed.",
        variant: "destructive",
      });
      navigate("/dashboard/dismissal", { replace: true });
      return;
    }
  }, [run, isLoading, mode, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" />
          Checking access permissions...
        </div>
      </div>
    );
  }

  // If specific mode is completed, don't render children
  if (mode === "bus" && run?.bus_completed) {
    return null;
  }
  
  if (mode === "car-line" && run?.car_line_completed) {
    return null;
  }
  
  if (mode === "walker" && run?.walker_completed) {
    return null;
  }
  
  if (mode === "classroom" && run?.status === "completed") {
    return null;
  }

  return <>{children}</>;
}