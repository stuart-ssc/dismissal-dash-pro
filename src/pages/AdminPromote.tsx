import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AdminPromote() {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const run = async () => {
      try {
        if (userRole === "system_admin") {
          toast({ title: "Already a System Admin", description: "Redirecting to System Administration." });
          navigate("/admin");
          return;
        }

        const { error } = await supabase
          .from("user_roles")
          .upsert([{ user_id: user.id, role: "system_admin" as any }], { onConflict: "user_id,role" });

        if (error) {
          toast({ title: "Could not grant System Admin", description: error.message, variant: "destructive" });
          navigate("/dashboard");
          return;
        }

        toast({ title: "System Admin enabled", description: "You now have access to System Administration." });
        window.location.replace("/admin");
      } catch (e: any) {
        toast({ title: "Unexpected error", description: e?.message ?? String(e), variant: "destructive" });
        navigate("/dashboard");
      }
    };

    run();
  }, [user, loading, userRole, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
