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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
                <span className="text-sm font-medium">Teacher Usage</span>
              </div>
              <div className="text-xl font-bold animate-pulse">--</div>
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          </div>
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Teacher Usage</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold">
                  {activeCount} active
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeCount > 0 ? getActiveModesSummary() : 'No active teachers'}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
              View Details →
            </Button>
          </div>
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