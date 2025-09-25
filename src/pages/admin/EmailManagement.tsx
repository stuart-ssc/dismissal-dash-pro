import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { EmailManagementDashboard } from "@/components/EmailManagementDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EmailManagement() {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Email Management | System Administration";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Manage email change requests and user email security.");
  }, []);

  useEffect(() => {
    if (!loading && userRole !== 'system_admin' && userRole !== 'school_admin') {
      navigate('/dashboard');
    }
  }, [loading, userRole, navigate]);

  if (loading) {
    return <div className="flex-1 p-6 text-center">Loading...</div>;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <Navbar />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground">
            Review and approve email change requests for enhanced security
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
        </Button>
      </div>

      <EmailManagementDashboard />
    </div>
  );
}