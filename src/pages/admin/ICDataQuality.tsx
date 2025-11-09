import { useNavigate } from "react-router-dom";
import { useMultiSchool } from "@/hooks/useMultiSchool";
import { useDataQuality } from "@/hooks/useDataQuality";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const gradeColors = {
  A: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-500' },
  B: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-500' },
  C: { bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-500' },
  D: { bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-500' },
  F: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-500' },
};

export default function ICDataQuality() {
  const navigate = useNavigate();
  const { activeSchoolId } = useMultiSchool();
  const { currentMetrics, historicalMetrics, isLoading, refetch } = useDataQuality(activeSchoolId);

  const grade = currentMetrics?.data_quality_grade || 'F';
  const colors = gradeColors[grade as keyof typeof gradeColors] || gradeColors.F;

  // Calculate percentages
  const studentContactPct = currentMetrics?.total_students 
    ? ((currentMetrics.total_students - currentMetrics.students_missing_contact_info) / currentMetrics.total_students * 100).toFixed(1)
    : '0';
  const studentEnrolledPct = currentMetrics?.total_students
    ? ((currentMetrics.total_students - currentMetrics.students_without_classes) / currentMetrics.total_students * 100).toFixed(1)
    : '0';
  const studentLinkedPct = currentMetrics?.total_students
    ? ((currentMetrics.total_students - currentMetrics.students_missing_ic_id) / currentMetrics.total_students * 100).toFixed(1)
    : '0';

  const teacherEmailPct = currentMetrics?.total_teachers
    ? ((currentMetrics.total_teachers - currentMetrics.teachers_missing_email) / currentMetrics.total_teachers * 100).toFixed(1)
    : '0';
  const teacherAssignedPct = currentMetrics?.total_teachers
    ? ((currentMetrics.total_teachers - currentMetrics.teachers_without_classes) / currentMetrics.total_teachers * 100).toFixed(1)
    : '0';
  const teacherAccountsPct = currentMetrics?.total_teachers
    ? ((currentMetrics.total_teachers - currentMetrics.teachers_without_accounts) / currentMetrics.total_teachers * 100).toFixed(1)
    : '0';

  const classWithTeachersPct = currentMetrics?.total_classes
    ? ((currentMetrics.total_classes - currentMetrics.classes_without_teachers) / currentMetrics.total_classes * 100).toFixed(1)
    : '0';
  const classWithStudentsPct = currentMetrics?.total_classes
    ? ((currentMetrics.total_classes - currentMetrics.classes_without_students) / currentMetrics.total_classes * 100).toFixed(1)
    : '0';

  // Prepare trend chart data
  const trendData = historicalMetrics?.slice().reverse().map(snapshot => ({
    date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Number(snapshot.overall_completeness_score),
  })) || [];

  // Generate recommendations
  const recommendations = [];
  if (currentMetrics) {
    if (currentMetrics.students_missing_contact_info > 0) {
      recommendations.push({
        severity: 'high',
        title: `${currentMetrics.students_missing_contact_info} students missing contact information`,
        description: 'Contact information is critical for dismissal safety and parent notifications.',
        action: 'Update contact information in Infinite Campus and sync again.',
      });
    }
    if (currentMetrics.students_without_classes > 0) {
      recommendations.push({
        severity: 'medium',
        title: `${currentMetrics.students_without_classes} students not enrolled in any classes`,
        description: 'Students without class enrollment cannot be assigned dismissal groups.',
        action: 'Review class rosters in Infinite Campus.',
      });
    }
    if (currentMetrics.teachers_without_accounts > currentMetrics.total_teachers * 0.3) {
      recommendations.push({
        severity: 'medium',
        title: `${currentMetrics.teachers_without_accounts} teachers haven't completed accounts`,
        description: 'Teachers need active accounts to use classroom modes and manage students.',
        action: 'Resend invitation emails to pending teachers.',
      });
    }
    if (currentMetrics.classes_without_teachers > 0) {
      recommendations.push({
        severity: 'low',
        title: `${currentMetrics.classes_without_teachers} classes have no assigned teachers`,
        description: 'Classes without teachers may be archived or need teacher assignment.',
        action: 'Review class teacher assignments in Infinite Campus.',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            IC Data Quality Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor data completeness and health metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh Data
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/integrations/ic-sync")}>
            ← Back to IC Dashboard
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card className={`${colors.bg} ${colors.border} border-2`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Overall Data Quality</h2>
              <div className="flex items-center gap-4">
                <div className={`text-6xl font-bold ${colors.text}`}>{grade}</div>
                <div>
                  <div className="text-3xl font-bold">{currentMetrics?.overall_completeness_score?.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Completeness Score</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              {grade === 'A' && <CheckCircle className="h-16 w-16 text-green-600 mb-2" />}
              {grade === 'B' && <TrendingUp className="h-16 w-16 text-blue-600 mb-2" />}
              {(grade === 'C' || grade === 'D') && <AlertTriangle className="h-16 w-16 text-yellow-600 mb-2" />}
              {grade === 'F' && <AlertCircle className="h-16 w-16 text-red-600 mb-2" />}
              <p className="text-sm text-muted-foreground">
                {grade === 'A' && 'Excellent data quality'}
                {grade === 'B' && 'Good data quality'}
                {grade === 'C' && 'Fair data quality'}
                {grade === 'D' && 'Needs improvement'}
                {grade === 'F' && 'Critical issues'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Student Data Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Student Data Health</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{currentMetrics?.total_students || 0} students</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>With contact info</span>
                <span className="font-medium">{studentContactPct}%</span>
              </div>
              <Progress value={Number(studentContactPct)} />
              <div className="flex justify-between">
                <span>Enrolled in classes</span>
                <span className="font-medium">{studentEnrolledPct}%</span>
              </div>
              <Progress value={Number(studentEnrolledPct)} />
              <div className="flex justify-between">
                <span>Linked to IC</span>
                <span className="font-medium">{studentLinkedPct}%</span>
              </div>
              <Progress value={Number(studentLinkedPct)} />
            </div>
          </CardContent>
        </Card>

        {/* Teacher Data Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teacher Data Health</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{currentMetrics?.total_teachers || 0} teachers</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>With email</span>
                <span className="font-medium">{teacherEmailPct}%</span>
              </div>
              <Progress value={Number(teacherEmailPct)} />
              <div className="flex justify-between">
                <span>Assigned to classes</span>
                <span className="font-medium">{teacherAssignedPct}%</span>
              </div>
              <Progress value={Number(teacherAssignedPct)} />
              <div className="flex justify-between">
                <span>With accounts</span>
                <span className="font-medium">{teacherAccountsPct}%</span>
              </div>
              <Progress value={Number(teacherAccountsPct)} />
            </div>
          </CardContent>
        </Card>

        {/* Class Data Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Data Health</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{currentMetrics?.total_classes || 0} classes</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>With assigned teachers</span>
                <span className="font-medium">{classWithTeachersPct}%</span>
              </div>
              <Progress value={Number(classWithTeachersPct)} />
              <div className="flex justify-between">
                <span>With enrolled students</span>
                <span className="font-medium">{classWithStudentsPct}%</span>
              </div>
              <Progress value={Number(classWithStudentsPct)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
          <CardDescription>Drill down into specific data quality issues</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="students">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Missing Contact Info</p>
                        <p className="text-2xl font-bold">{currentMetrics?.students_missing_contact_info || 0}</p>
                      </div>
                      {(currentMetrics?.students_missing_contact_info || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Missing Parent Name</p>
                        <p className="text-2xl font-bold">{currentMetrics?.students_missing_parent_name || 0}</p>
                      </div>
                      {(currentMetrics?.students_missing_parent_name || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Not Linked to IC</p>
                        <p className="text-2xl font-bold">{currentMetrics?.students_missing_ic_id || 0}</p>
                      </div>
                      {(currentMetrics?.students_missing_ic_id || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Without Classes</p>
                        <p className="text-2xl font-bold">{currentMetrics?.students_without_classes || 0}</p>
                      </div>
                      {(currentMetrics?.students_without_classes || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="teachers" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Missing Email</p>
                        <p className="text-2xl font-bold">{currentMetrics?.teachers_missing_email || 0}</p>
                      </div>
                      {(currentMetrics?.teachers_missing_email || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Not Linked to IC</p>
                        <p className="text-2xl font-bold">{currentMetrics?.teachers_missing_ic_id || 0}</p>
                      </div>
                      {(currentMetrics?.teachers_missing_ic_id || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Without Classes</p>
                        <p className="text-2xl font-bold">{currentMetrics?.teachers_without_classes || 0}</p>
                      </div>
                      {(currentMetrics?.teachers_without_classes || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Without Accounts</p>
                        <p className="text-2xl font-bold">{currentMetrics?.teachers_without_accounts || 0}</p>
                      </div>
                      {(currentMetrics?.teachers_without_accounts || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Without Teachers</p>
                        <p className="text-2xl font-bold">{currentMetrics?.classes_without_teachers || 0}</p>
                      </div>
                      {(currentMetrics?.classes_without_teachers || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Without Students</p>
                        <p className="text-2xl font-bold">{currentMetrics?.classes_without_students || 0}</p>
                      </div>
                      {(currentMetrics?.classes_without_students || 0) > 0 ? (
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4 mt-4">
              {trendData.length > 1 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Completeness Score (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Not enough historical data to show trends</p>
                  <p className="text-sm mt-2">Sync data at least twice to see quality trends over time</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Actions to improve data quality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, idx) => (
              <Alert key={idx} variant={rec.severity === 'high' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{rec.title}</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{rec.description}</p>
                  <p className="text-sm font-medium">Action: {rec.action}</p>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
