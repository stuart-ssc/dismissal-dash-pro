import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart-secure";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, Users, ArrowRight, TrendingUp, ClipboardList, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { useState, useEffect } from "react";
import { useReportsData } from "@/hooks/useReportsData";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";

const Reports = () => {
  const SEO = useSEO();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<number>(14); // Default to 14 days
  const [currentPage, setCurrentPage] = useState(1);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [academicSessions, setAcademicSessions] = useState<Array<{ id: string; session_name: string; is_active: boolean }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSessionId, setCompareSessionId] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (profile?.school_id) {
          setSchoolId(profile.school_id);

          // Fetch academic sessions
          const { data: sessions } = await supabase
            .from('academic_sessions')
            .select('id, session_name, is_active')
            .eq('school_id', profile.school_id)
            .order('is_active', { ascending: false })
            .order('start_date', { ascending: false });

          if (sessions) {
            setAcademicSessions(sessions);
            // Pre-select active session
            const activeSession = sessions.find(s => s.is_active);
            if (activeSession) {
              setSelectedSessionId(activeSession.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching school data:', error);
      }
    };

    fetchSchoolData();
  }, [user]);

  const { chartData, compareChartData, dismissalLogs, isLoading, error } = useReportsData({
    dateRangeDays: dateRange,
    currentPage,
    itemsPerPage,
    sessionId: selectedSessionId,
    compareSessionId: compareEnabled ? compareSessionId : null
  });

  const totalPages = dismissalLogs ? Math.ceil(dismissalLogs.totalCount / itemsPerPage) : 0;

  // Merge chart data for comparison
  const mergedChartData = chartData.map((point, index) => ({
    date: point.date,
    current: point.duration,
    compare: compareChartData[index]?.duration || 0
  }));

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--";
    return format(new Date(timeString), "h:mm a");
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "--";
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    return `${duration} min`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'completed': { label: 'Completed', variant: 'default' as const },
      'active': { label: 'Active', variant: 'secondary' as const },
      'preparation': { label: 'Preparation', variant: 'outline' as const },
      'scheduled': { label: 'Scheduled', variant: 'outline' as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const chartConfig = compareEnabled ? {
    current: {
      label: academicSessions.find(s => s.id === selectedSessionId)?.session_name || "Current Session",
      color: "hsl(var(--primary))"
    },
    compare: {
      label: academicSessions.find(s => s.id === compareSessionId)?.session_name || "Compare Session",
      color: "hsl(var(--secondary))"
    }
  } : {
    duration: {
      label: "Duration (minutes)",
      color: "hsl(var(--primary))"
    }
  };

  return (
    <>
      <SEO />
      <main className="flex-1 p-6 space-y-6">
        {/* Mode Usage Reports Card */}
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate('/dashboard/reports/mode-usage')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mode Usage Reports
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              Detailed analytics on teacher mode usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View comprehensive reports on how teachers are using different dismissal modes.
            </p>
          </CardContent>
        </Card>

        {/* Dismissal Detail Report Card */}
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate('/dashboard/reports/detail')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Dismissal Detail Report
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              View every logged interaction for a day with filtering and search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              See exactly how each student left the building, who marked absences, and all activities.
            </p>
          </CardContent>
        </Card>
        {/* Recent Dismissals Chart */}
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Dismissals
              </CardTitle>
              <CardDescription>
                Dismissal duration trends over time
                {selectedSessionId && academicSessions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {academicSessions.find(s => s.id === selectedSessionId)?.session_name}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session Filters */}
            {academicSessions.length > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-filter" className="text-sm font-medium">
                      Academic Year / Session
                    </Label>
                    <Select value={selectedSessionId || ''} onValueChange={(value) => setSelectedSessionId(value)}>
                      <SelectTrigger id="session-filter">
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicSessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.session_name} {session.is_active && '(Active)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {compareEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="compare-session-filter" className="text-sm font-medium">
                        Compare with
                      </Label>
                      <Select value={compareSessionId || ''} onValueChange={(value) => setCompareSessionId(value)}>
                        <SelectTrigger id="compare-session-filter">
                          <SelectValue placeholder="Select session to compare" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicSessions
                            .filter(s => s.id !== selectedSessionId)
                            .map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                {session.session_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="compare-mode" 
                    checked={compareEnabled}
                    onCheckedChange={(checked) => setCompareEnabled(checked as boolean)}
                  />
                  <label
                    htmlFor="compare-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Compare with another academic year
                  </label>
                </div>
              </div>
            )}

            <div className="h-[300px] w-full relative overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Error loading chart data
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No dismissal data available for the selected period
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareEnabled ? mergedChartData : chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      />
                      {compareEnabled ? (
                        <>
                          <Legend />
                          <Bar 
                            dataKey="current" 
                            fill="var(--color-current)" 
                            radius={[4, 4, 0, 0]}
                            name={chartConfig.current.label}
                          />
                          <Bar 
                            dataKey="compare" 
                            fill="var(--color-compare)" 
                            radius={[4, 4, 0, 0]}
                            name={chartConfig.compare.label}
                          />
                        </>
                      ) : (
                        <Bar 
                          dataKey="duration" 
                          fill="var(--color-duration)" 
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dismissal Log Table */}
        <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Dismissal Log</CardTitle>
            <CardDescription>
              Complete history of dismissal runs with timing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                Error loading dismissal logs
              </div>
            ) : !dismissalLogs || dismissalLogs.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No dismissal logs found
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Car Line</TableHead>
                      <TableHead>Walker</TableHead>
                      <TableHead>Bus</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dismissalLogs.data.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">
                          {format(new Date(run.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{formatTime(run.scheduled_start_time)}</TableCell>
                        <TableCell>{formatTime(run.ended_at)}</TableCell>
                        <TableCell>
                          {run.car_line_completed_at 
                            ? formatDuration(run.scheduled_start_time, run.car_line_completed_at)
                            : "--"
                          }
                        </TableCell>
                        <TableCell>
                          {run.walker_completed_at 
                            ? formatDuration(run.scheduled_start_time, run.walker_completed_at)
                            : "--"
                          }
                        </TableCell>
                        <TableCell>
                          {run.bus_completed_at 
                            ? formatDuration(run.scheduled_start_time, run.bus_completed_at)
                            : "--"
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({dismissalLogs.totalCount} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Reports;