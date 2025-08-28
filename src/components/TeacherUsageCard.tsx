import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Activity } from 'lucide-react';
import { useTeacherModeActivity } from '@/hooks/useTeacherModeActivity';
import { TeacherActivityMonitor } from './TeacherActivityMonitor';

interface TeacherUsageCardProps {
  schoolId: number | null;
}

export function TeacherUsageCard({ schoolId }: TeacherUsageCardProps) {
  const [showMonitor, setShowMonitor] = useState(false);
  const { teachers, loading, activeCount } = useTeacherModeActivity(schoolId);

  const getActiveModesSummary = () => {
    const activeModes = teachers
      .filter(t => t.is_active)
      .reduce((acc, teacher) => {
        if (teacher.mode_type) {
          acc[teacher.mode_type] = (acc[teacher.mode_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

    const modeLabels = {
      classroom: 'Classroom',
      bus: 'Bus',
      car_line: 'Car Line',
      walker: 'Walker'
    };

    return Object.entries(activeModes)
      .map(([mode, count]) => `${count} ${modeLabels[mode as keyof typeof modeLabels] || mode}`)
      .join(', ');
  };

  if (loading) {
    return (
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Teacher Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold animate-pulse">--</div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="shadow-elevated border-0 bg-card/80 backdrop-blur cursor-pointer transition-colors hover:bg-card/90"
        onClick={() => setShowMonitor(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Teacher Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeCount} active
          </div>
          <p className="text-xs text-muted-foreground">
            {activeCount > 0 ? getActiveModesSummary() : 'No active teachers'}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 h-8 px-2 text-xs">
            View Details →
          </Button>
        </CardContent>
      </Card>

      <TeacherActivityMonitor
        open={showMonitor}
        onClose={() => setShowMonitor(false)}
        teachers={teachers}
        loading={loading}
      />
    </>
  );
}