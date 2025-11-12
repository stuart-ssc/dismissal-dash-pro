import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Archive, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Review Current Session", icon: GraduationCap },
  { id: 2, title: "Create New Session", icon: Plus },
  { id: 3, title: "Archive Current Session", icon: Archive },
  { id: 4, title: "Complete", icon: CheckCircle },
];

export default function YearEndRollover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Current session data
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    groups: 0,
    runs: 0,
  });

  // New session data
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionCode, setNewSessionCode] = useState("");
  const [newSessionStartDate, setNewSessionStartDate] = useState("");
  const [newSessionEndDate, setNewSessionEndDate] = useState("");

  useEffect(() => {
    fetchCurrentSession();
  }, [user?.id]);

  const fetchCurrentSession = async () => {
    try {
      setLoading(true);

      // Get school ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.school_id) {
        toast.error("School not found");
        return;
      }

      setSchoolId(profile.school_id);

      // Get active session
      const { data: session } = await supabase
        .from("academic_sessions")
        .select("*")
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!session) {
        toast.error("No active session found");
        return;
      }

      setCurrentSession(session);

      // Generate default values for next session
      const currentYear = new Date(session.end_date).getFullYear();
      const nextYear = currentYear + 1;
      setNewSessionName(`${nextYear}-${nextYear + 1} School Year`);
      setNewSessionCode(`SY${nextYear}-${nextYear + 1}`);
      setNewSessionStartDate(format(new Date(nextYear, 7, 15), "yyyy-MM-dd")); // Aug 15
      setNewSessionEndDate(format(new Date(nextYear + 1, 5, 15), "yyyy-MM-dd")); // June 15

      // Fetch stats for current session
      const [studentsRes, teachersRes, classesRes, groupsRes, runsRes] = await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("academic_session_id", session.id),
        supabase
          .from("teachers")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id),
        supabase
          .from("classes")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("academic_session_id", session.id),
        supabase
          .from("special_use_groups")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("academic_session_id", session.id),
        supabase
          .from("special_use_runs")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("academic_session_id", session.id),
      ]);

      setSessionStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        classes: classesRes.count || 0,
        groups: groupsRes.count || 0,
        runs: runsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load current session");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSession = async () => {
    if (!schoolId) return;

    if (!newSessionName || !newSessionCode || !newSessionStartDate || !newSessionEndDate) {
      toast.error("Please fill in all fields");
      return;
    }

    if (new Date(newSessionEndDate) <= new Date(newSessionStartDate)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setProcessing(true);

      const { data, error } = await supabase
        .from("academic_sessions")
        .insert({
          school_id: schoolId,
          session_name: newSessionName,
          session_code: newSessionCode,
          start_date: newSessionStartDate,
          end_date: newSessionEndDate,
          is_active: false,
          session_type: "schoolYear",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("New academic session created");
      setCurrentStep(3);
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create new session");
    } finally {
      setProcessing(false);
    }
  };

  const handleArchiveCurrentSession = async () => {
    if (!currentSession?.id) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("academic_sessions")
        .update({ is_active: false })
        .eq("id", currentSession.id);

      if (error) throw error;

      // Set new session as active
      const { error: activateError } = await supabase
        .from("academic_sessions")
        .update({ is_active: true })
        .eq("school_id", schoolId)
        .eq("session_name", newSessionName);

      if (activateError) throw activateError;

      // Get school name for email notification
      const { data: school } = await supabase
        .from("schools")
        .select("school_name")
        .eq("id", schoolId)
        .single();

      // Send notification emails to all staff
      const { error: notificationError } = await supabase.functions.invoke(
        "send-year-end-rollover-notification",
        {
          body: {
            schoolId,
            schoolName: school?.school_name || "Your School",
            oldSessionName: currentSession.session_name,
            newSessionName,
            newSessionStartDate,
            newSessionEndDate,
            completedByUserId: user?.id,
          },
        }
      );

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the whole operation if email fails
        toast.warning("Session archived successfully, but email notifications failed to send");
      } else {
        toast.success("Current session archived, new session activated, and staff notified");
      }

      setCurrentStep(4);
    } catch (error: any) {
      console.error("Error archiving session:", error);
      toast.error(error.message || "Failed to archive session");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (!currentSession) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No active academic session found. Please create one before proceeding with rollover.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Year-End Rollover Wizard
          </h1>
          <p className="text-muted-foreground mt-2">
            Archive the current academic year and set up the next school year
          </p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} />
              <div className="flex justify-between">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-2 ${
                      step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`rounded-full p-2 ${
                        step.id <= currentStep ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-center max-w-[80px]">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Current Session</CardTitle>
              <CardDescription>
                Review the data that will be archived from the current academic year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{currentSession.session_name}</h3>
                  <Badge>{currentSession.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(currentSession.start_date), "MMM d, yyyy")} - 
                    {format(new Date(currentSession.end_date), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{sessionStats.students}</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{sessionStats.teachers}</div>
                  <div className="text-sm text-muted-foreground">Teachers</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{sessionStats.classes}</div>
                  <div className="text-sm text-muted-foreground">Classes</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{sessionStats.groups}</div>
                  <div className="text-sm text-muted-foreground">Groups</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{sessionStats.runs}</div>
                  <div className="text-sm text-muted-foreground">Special Runs</div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This data will remain in the system but will be marked as archived. You'll still be able to access historical data and reports.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setCurrentStep(2)}>
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Academic Session</CardTitle>
              <CardDescription>
                Set up the next school year with dates and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">Session Name</Label>
                <Input
                  id="session-name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., 2025-2026 School Year"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-code">Session Code</Label>
                <Input
                  id="session-code"
                  value={newSessionCode}
                  onChange={(e) => setNewSessionCode(e.target.value)}
                  placeholder="e.g., SY2025-2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newSessionStartDate}
                    onChange={(e) => setNewSessionStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newSessionEndDate}
                    onChange={(e) => setNewSessionEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  The new session will be created but not activated yet. You'll activate it in the next step after archiving the current session.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button onClick={handleCreateNewSession} disabled={processing}>
                  {processing ? "Creating..." : "Create Session"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Archive Current Session</CardTitle>
              <CardDescription>
                Archive the current session and activate the new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This action will mark the current session as inactive and activate the new session. This cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted">
                  <h4 className="font-medium mb-2">Current Session (Will be archived)</h4>
                  <p className="text-sm text-muted-foreground">{currentSession.session_name}</p>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <h4 className="font-medium mb-2">New Session (Will be activated)</h4>
                  <p className="text-sm text-muted-foreground">{newSessionName}</p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button onClick={handleArchiveCurrentSession} disabled={processing} variant="default">
                  {processing ? "Processing..." : "Archive & Activate"}
                  <Archive className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-success" />
                Rollover Complete
              </CardTitle>
              <CardDescription>
                Your school is now set up for the new academic year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Year-End Rollover Complete!</h3>
                <p className="text-muted-foreground mb-6">
                  The new academic session <strong>{newSessionName}</strong> is now active.
                  All staff members have been notified via email.
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Next Steps:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Import or sync new student rosters</li>
                    <li>Update class schedules and teacher assignments</li>
                    <li>Review and update dismissal plans</li>
                    <li>Migrate special use groups from previous year</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center gap-3">
                <Button onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard/import")}>
                  Import Rosters
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dashboard/people/groups-teams")}
                >
                  Manage Groups
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
