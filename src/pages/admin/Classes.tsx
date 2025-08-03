import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, User } from "lucide-react";

const Classes = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || userRole !== 'school_admin')) {
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

  if (!user || userRole !== 'school_admin') {
    return null;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage school classes and student assignments</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              3rd Grade - Room 101
            </CardTitle>
            <CardDescription>Mrs. Johnson's Class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Students:</span>
                <span className="font-medium">22</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teacher:</span>
                <span className="font-medium">Sarah Johnson</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Grade Level:</span>
                <span className="font-medium">3rd Grade</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              4th Grade - Room 205
            </CardTitle>
            <CardDescription>Mr. Smith's Class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Students:</span>
                <span className="font-medium">25</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teacher:</span>
                <span className="font-medium">Michael Smith</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Grade Level:</span>
                <span className="font-medium">4th Grade</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              5th Grade - Room 310
            </CardTitle>
            <CardDescription>Ms. Davis's Class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Students:</span>
                <span className="font-medium">20</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teacher:</span>
                <span className="font-medium">Emily Davis</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Grade Level:</span>
                <span className="font-medium">5th Grade</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Classes;