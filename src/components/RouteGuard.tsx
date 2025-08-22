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

    // Check if the dismissal is completed for bus mode
    if (mode === "bus" && run.status === "completed") {
      toast({
        title: "Access Denied",
        description: "Bus dismissal has already been completed for today.",
        variant: "destructive",
      });
      navigate("/dashboard/dismissal", { replace: true });
      return;
    }

    // Add additional checks for other modes if needed in the future
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

  // If bus mode is completed, don't render children
  if (mode === "bus" && run?.status === "completed") {
    return null;
  }

  return <>{children}</>;
}