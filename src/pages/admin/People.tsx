import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, UserCog, Users as UsersIcon } from "lucide-react";

const Users = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">People</h1>
          <p className="text-muted-foreground">Manage teachers, staff, and user permissions</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Last login today
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all users in your school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">sarah.johnson@school.edu • Teacher</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">Michael Smith</p>
                  <p className="text-sm text-muted-foreground">michael.smith@school.edu • Teacher</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Emily Davis</p>
                  <p className="text-sm text-muted-foreground">emily.davis@school.edu • Teacher</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;