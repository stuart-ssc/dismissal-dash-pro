import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-secure";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Download, 
  Building2, 
  TrendingUp, 
  Users, 
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useDistrictReportsData } from "@/hooks/useDistrictReportsData";
import { supabase } from "@/integrations/supabase/client";
import { useDistrictAuth } from "@/hooks/useDistrictAuth";
import { convertToCSV, downloadCSV, formatDateForCSV, formatTimeForCSV } from "@/lib/csvExport";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DistrictReports() {
  const navigate = useNavigate();
  const { district, districtSchools } = useDistrictAuth();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<number>(14);
  const [currentPage, setCurrentPage] = useState(1);
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSessionId, setCompareSessionId] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'duration' | 'dismissals'>('duration');
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchAcademicSessions = async () => {
      if (!district?.id || !districtSchools || districtSchools.length === 0) return;

      try {
        // Get sessions from all district schools
        const schoolIds = districtSchools.map(s => s.id);
        const { data: sessions } = await supabase
          .from('academic_sessions')
          .select('id, session_name, is_active, school_id')
          .in('school_id', schoolIds)
          .order('is_active', { ascending: false })
          .order('start_date', { ascending: false });

        if (sessions) {
          // Deduplicate by session_name (assuming same session name across schools)
          const uniqueSessions = sessions.reduce((acc, session) => {
            if (!acc.find(s => s.session_name === session.session_name)) {
              acc.push(session);
            }
            return acc;
          }, [] as typeof sessions);

          setAcademicSessions(uniqueSessions);
          const activeSession = uniqueSessions.find(s => s.is_active);
          if (activeSession) {
            setSelectedSessionId(activeSession.id);
          }
        }
      } catch (error) {
        console.error('Error fetching academic sessions:', error);
      }
    };

    fetchAcademicSessions();
  }, [district?.id, districtSchools]);

  const { 
    summaryStats, 
    chartData, 
    compareChartData, 
    schoolPerformance, 
    dismissalLogs, 
    isLoading, 
    error 
  } = useDistrictReportsData({
    dateRangeDays: dateRange,
    currentPage,
    itemsPerPage,
    sessionId: selectedSessionId,
    compareSessionId: compareEnabled ? compareSessionId : null,
    schoolFilter
  });

  const totalPages = dismissalLogs ? Math.ceil(dismissalLogs.totalCount / itemsPerPage) : 0;

  const mergedChartData = chartData.map((point, index) => ({
    date: point.date,
    current: point.duration,
    compare: compareChartData[index]?.duration || 0
  }));

  const sortedSchoolPerformance = [...schoolPerformance].sort((a, b) => {
    if (sortBy === 'duration') {
      return b.avg_duration - a.avg_duration;
    }
    return b.total_dismissals - a.total_dismissals;
  });

  const handleExportCSV = () => {
    if (!dismissalLogs) return;

    const csvData = dismissalLogs.data.map(log => ({
      Date: formatDateForCSV(log.date),
      School: log.school_name,
      'Start Time': formatTimeForCSV(log.scheduled_start_time),
      'End Time': formatTimeForCSV(log.ended_at),
      'Duration (min)': log.duration || '--',
      Status: log.status
    }));

    const csv = convertToCSV(csvData, ['Date', 'School', 'Start Time', 'End Time', 'Duration (min)', 'Status']);
    downloadCSV(csv, `district-dismissal-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--";
    return format(new Date(timeString), "h:mm a");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      completed: { variant: "default", label: "Completed" },
      active: { variant: "secondary", label: "Active" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      scheduled: { variant: "outline", label: "Scheduled" }
    };

    const statusInfo = statusMap[status] || { variant: "outline" as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPerformanceBadge = (status: 'excellent' | 'good' | 'needs-attention') => {
    const badgeMap = {
      'excellent': { variant: "default" as const, label: "Excellent" },
      'good': { variant: "secondary" as const, label: "Good" },
      'needs-attention': { variant: "destructive" as const, label: "Needs Attention" }
    };
    const info = badgeMap[status];
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const chartConfig = {
    current: {
      label: selectedSessionId 
        ? academicSessions.find(s => s.id === selectedSessionId)?.session_name || "Current Session"
        : "Current Session",
      color: "hsl(var(--primary))",
    },
    compare: {
      label: compareSessionId
        ? academicSessions.find(s => s.id === compareSessionId)?.session_name || "Previous Session"
        : "Previous Session",
      color: "hsl(var(--secondary))",
    },
  };

  if (error) {
    return (
      <div className="space-y-6 px-4 py-6 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Reports</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:p-6">
      {/* Summary Statistics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalSchools}</div>
            <p className="text-xs text-muted-foreground">Active schools in district</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dismissals</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalDismissals}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgDuration} min</div>
            <p className="text-xs text-muted-foreground">District-wide average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedSessionId || "all"} onValueChange={(value) => setSelectedSessionId(value === "all" ? null : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            {academicSessions.map(session => (
              <SelectItem key={session.id} value={session.id}>
                {session.session_name} {session.is_active && "(Active)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* District Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>District-Wide Performance</CardTitle>
              <CardDescription>Average dismissal duration across all schools</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="compare" 
                checked={compareEnabled}
                onCheckedChange={(checked) => {
                  setCompareEnabled(!!checked);
                  if (!checked) setCompareSessionId(null);
                }}
              />
              <Label htmlFor="compare" className="text-sm cursor-pointer">
                Compare sessions
              </Label>
            </div>
          </div>
          {compareEnabled && (
            <div className="mt-3">
              <Select value={compareSessionId || ""} onValueChange={setCompareSessionId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select session to compare" />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions
                    .filter(s => s.id !== selectedSessionId)
                    .map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.session_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading chart data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No dismissal data available for the selected period
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareEnabled && compareChartData.length > 0 ? mergedChartData : chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {compareEnabled && compareChartData.length > 0 && <Legend />}
                  <Bar 
                    dataKey={compareEnabled && compareChartData.length > 0 ? "current" : "duration"}
                    fill="var(--color-current)" 
                    radius={[4, 4, 0, 0]}
                  />
                  {compareEnabled && compareChartData.length > 0 && (
                    <Bar dataKey="compare" fill="var(--color-compare)" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* School Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>School Performance Comparison</CardTitle>
              <CardDescription>Performance metrics for each school in your district</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSortBy(sortBy === 'duration' ? 'dismissals' : 'duration')}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by {sortBy === 'duration' ? 'Dismissals' : 'Duration'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading school data...</div>
          ) : sortedSchoolPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No school data available</div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {sortedSchoolPerformance.map(school => (
                  <Card key={school.school_id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{school.school_name}</CardTitle>
                        {getPerformanceBadge(school.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Dismissals</p>
                          <p className="font-medium">{school.total_dismissals}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Duration</p>
                          <p className="font-medium">{school.avg_duration} min</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => {
                          // Impersonate school and navigate to school reports
                          navigate(`/district-dash/schools`);
                        }}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead className="text-right">Total Dismissals</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchoolPerformance.map(school => (
                      <TableRow key={school.school_id}>
                        <TableCell className="font-medium">{school.school_name}</TableCell>
                        <TableCell className="text-right">{school.total_dismissals}</TableCell>
                        <TableCell className="text-right">{school.avg_duration} min</TableCell>
                        <TableCell>{getPerformanceBadge(school.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Navigate to schools management
                              navigate(`/district-dash/schools`);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Dismissal Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Dismissal Activity</CardTitle>
              <CardDescription>Combined log of dismissals across all schools</CardDescription>
            </div>
            <Select 
              value={schoolFilter?.toString() || "all"} 
              onValueChange={(value) => {
                setSchoolFilter(value === "all" ? null : Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {districtSchools?.map(school => (
                  <SelectItem key={school.id} value={school.id.toString()}>
                    {school.school_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activity log...</div>
          ) : !dismissalLogs || dismissalLogs.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No dismissal activity found</div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {dismissalLogs.data.map(log => (
                  <Card key={log.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {format(new Date(log.date), "MMM d, yyyy")}
                          </Badge>
                          <CardTitle className="text-base">{log.school_name}</CardTitle>
                        </div>
                        {getStatusBadge(log.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Start</p>
                          <p className="font-medium">{formatTime(log.scheduled_start_time)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End</p>
                          <p className="font-medium">{formatTime(log.ended_at)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{log.duration ? `${log.duration} min` : '--'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dismissalLogs.data.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {format(new Date(log.date), "MMM d, yyyy")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.school_name}</TableCell>
                        <TableCell>{formatTime(log.scheduled_start_time)}</TableCell>
                        <TableCell>{formatTime(log.ended_at)}</TableCell>
                        <TableCell className="text-right">
                          {log.duration ? `${log.duration} min` : '--'}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, dismissalLogs.totalCount)} of{" "}
                    {dismissalLogs.totalCount} results
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
