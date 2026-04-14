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
  BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const gradeColors = {
  A: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
  B: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  C: { bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' },
  D: { bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
  F: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
};

interface ICDataQualityTabProps {
  schoolId: number | null;
}

export function ICDataQualityTab({ schoolId }: ICDataQualityTabProps) {
  const { currentMetrics, historicalMetrics, isLoading, refetch } = useDataQuality(schoolId);

  const grade = currentMetrics?.data_quality_grade || 'F';
  const colors = gradeColors[grade as keyof typeof gradeColors] || gradeColors.F;

  // Calculate percentages
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Data Quality Metrics
          </h2>
          <p className="text-muted-foreground">Monitor data completeness and health</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh Data
        </Button>
      </div>

      {/* Overall Health Score */}
      <Card className={`${colors.bg} ${colors.border} border-2`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Overall Data Quality</h3>
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-bold ${colors.text}`}>{grade}</div>
                <div>
                  <div className="text-2xl font-bold">{currentMetrics?.overall_completeness_score?.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Completeness Score</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              {grade === 'A' && <CheckCircle className="h-12 w-12 text-green-600 mb-2" />}
              {grade === 'B' && <TrendingUp className="h-12 w-12 text-blue-600 mb-2" />}
              {(grade === 'C' || grade === 'D') && <AlertTriangle className="h-12 w-12 text-yellow-600 mb-2" />}
              {grade === 'F' && <AlertCircle className="h-12 w-12 text-red-600 mb-2" />}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Data Health</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{currentMetrics?.total_classes || 0} classes</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>With teachers</span>
                <span className="font-medium">{classWithTeachersPct}%</span>
              </div>
              <Progress value={Number(classWithTeachersPct)} />
              <div className="flex justify-between">
                <span>With students</span>
                <span className="font-medium">{classWithStudentsPct}%</span>
              </div>
              <Progress value={Number(classWithStudentsPct)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Trend (Last 30 Days)</CardTitle>
            <CardDescription>Track your data quality improvements over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Quality Score %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
