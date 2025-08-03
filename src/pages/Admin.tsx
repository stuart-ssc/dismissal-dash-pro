import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, School, Users, Settings, BarChart3, Database } from "lucide-react";
import Navbar from "@/components/Navbar";

const Admin = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && userRole !== 'system_admin') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'system_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Administration</h1>
              <p className="text-muted-foreground">
                Manage the entire Dismissal Pro platform
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">147</div>
              <p className="text-xs text-muted-foreground">
                +5 new this month
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-muted-foreground">
                Uptime this month
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Dismissals</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15,234</div>
              <p className="text-xs text-muted-foreground">
                Across all schools
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Administrative Actions</CardTitle>
              <CardDescription>
                System-wide management tools
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <Button className="w-full justify-start" variant="outline">
                <School className="mr-2 h-4 w-4" />
                Manage Schools
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Database Administration
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                System Configuration
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics & Reports
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Important notifications and warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">System backup completed</p>
                    <p className="text-xs text-green-600 dark:text-green-400">10 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">High server load detected</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Scheduled maintenance window</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Tomorrow at 2 AM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;