import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Download, Clock, User, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ModeSession {
  id: string;
  user_id: string;
  mode_type: 'classroom' | 'bus' | 'car_line' | 'walker';
  location_name: string | null;
  started_at: string;
  ended_at: string | null;
  session_duration_seconds: number | null;
  dismissal_run_date?: string;
  teacher_name?: string;
}

interface UsageStats {
  totalSessions: number;
  averageSessionDuration: number;
  modeBreakdown: Record<string, number>;
  activeTeachers: number;
}

export default function ModeUsageReports() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ModeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  
  // Fetch teachers for filter
  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');
      
      if (data) {
        setTeachers(data.map(t => ({
          id: t.id,
          name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown'
        })));
      }
    };
    fetchTeachers();
  }, []);

  // Fetch mode sessions
  const fetchSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('mode_sessions')
        .select(`
          id,
          user_id,
          mode_type,
          location_name,
          started_at,
          ended_at,
          session_duration_seconds,
          dismissal_runs(date)
        `)
        .gte('started_at', `${dateRange.start}T00:00:00`)
        .lte('started_at', `${dateRange.end}T23:59:59`)
        .order('started_at', { ascending: false });

      if (modeFilter !== 'all') {
        query = query.eq('mode_type', modeFilter);
      }

      if (teacherFilter !== 'all') {
        query = query.eq('user_id', teacherFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with teacher names
      const enrichedSessions = await Promise.all(
        (data || []).map(async (session: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user_id)
            .single();

          return {
            ...session,
            dismissal_run_date: session.dismissal_runs?.date || null,
            teacher_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
              : 'Unknown Teacher'
          };
        })
      );

      setSessions(enrichedSessions);

      // Calculate stats
      const totalSessions = enrichedSessions.length;
      const completedSessions = enrichedSessions.filter(s => s.ended_at && s.session_duration_seconds);
      const averageSessionDuration = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((acc, s) => acc + (s.session_duration_seconds || 0), 0) / completedSessions.length)
        : 0;
      
      const modeBreakdown = enrichedSessions.reduce((acc, session) => {
        acc[session.mode_type] = (acc[session.mode_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const activeTeachers = new Set(enrichedSessions.map(s => s.user_id)).size;

      setStats({
        totalSessions,
        averageSessionDuration,
        modeBreakdown,
        activeTeachers
      });

    } catch (error) {
      console.error('Error fetching mode sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [dateRange, modeFilter, teacherFilter]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Ongoing';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getModeColor = (mode: string) => {
    const colors = {
      classroom: 'bg-blue-100 text-blue-800',
      bus: 'bg-yellow-100 text-yellow-800',
      car_line: 'bg-green-100 text-green-800',
      walker: 'bg-purple-100 text-purple-800'
    };
    return colors[mode as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Teacher', 'Mode', 'Location', 'Start Time', 'End Time', 'Duration'];
    const csvData = sessions.map(session => [
      session.dismissal_run_date || format(new Date(session.started_at), 'yyyy-MM-dd'),
      session.teacher_name || 'Unknown',
      session.mode_type,
      session.location_name || 'N/A',
      format(new Date(session.started_at), 'HH:mm:ss'),
      session.ended_at ? format(new Date(session.ended_at), 'HH:mm:ss') : 'Ongoing',
      formatDuration(session.session_duration_seconds)
    ]);

    const csv = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mode-usage-report-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight">Mode Usage Reports</h1>
          <p className="text-muted-foreground mt-2">
            Track teacher usage of dismissal mode interfaces
          </p>
        </header>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mode</label>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="classroom">Classroom</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="car_line">Car Line</SelectItem>
                    <SelectItem value="walker">Walker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Teacher</label>
                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={exportToCSV} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                    <p className="text-2xl font-bold">{stats.activeTeachers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                    <p className="text-2xl font-bold">{formatDuration(stats.averageSessionDuration)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Most Used</p>
                    <p className="text-2xl font-bold capitalize">
                      {Object.entries(stats.modeBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mode Usage Sessions</CardTitle>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No sessions found for the selected criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {session.dismissal_run_date || format(new Date(session.started_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {session.teacher_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getModeColor(session.mode_type)}>
                            {session.mode_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.location_name || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(session.started_at), 'HH:mm:ss')}</TableCell>
                        <TableCell>
                          {session.ended_at ? format(new Date(session.ended_at), 'HH:mm:ss') : (
                            <Badge variant="outline" className="text-green-600">Ongoing</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(session.session_duration_seconds)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}