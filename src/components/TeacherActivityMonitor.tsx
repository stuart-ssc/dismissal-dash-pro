import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { TeacherModeActivity } from '@/hooks/useTeacherModeActivity';
import { formatDistanceToNow } from 'date-fns';

interface TeacherActivityMonitorProps {
  open: boolean;
  onClose: () => void;
  teachers: TeacherModeActivity[];
  loading: boolean;
}

export function TeacherActivityMonitor({ open, onClose, teachers, loading }: TeacherActivityMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeachers = teachers.filter(teacher => 
    `${teacher.first_name} ${teacher.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort: active teachers first, then by start time (most recent first), then alphabetically
  const sortedTeachers = filteredTeachers.sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    
    if (a.is_active && b.is_active) {
      if (a.started_at && b.started_at) {
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      }
    }
    
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  const getModeColor = (mode: string | null) => {
    switch (mode) {
      case 'classroom': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'bus': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'car_line': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'walker': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getModeLabel = (mode: string | null) => {
    switch (mode) {
      case 'classroom': return 'Classroom';
      case 'bus': return 'Bus';
      case 'car_line': return 'Car Line';
      case 'walker': return 'Walker';
      default: return 'Not Active';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Teacher Activity Monitor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="text-sm text-muted-foreground">
              {filteredTeachers.filter(t => t.is_active).length} of {filteredTeachers.length} active
            </div>
          </div>

          <div className="overflow-auto max-h-[50vh]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading teacher activity...
                </div>
              ) : sortedTeachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No teachers found
                </div>
              ) : (
                sortedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      teacher.is_active 
                        ? 'bg-card border-border' 
                        : 'bg-muted/50 border-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        teacher.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`} />
                      <div>
                        <div className="font-medium">
                          {teacher.first_name} {teacher.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <Badge className={getModeColor(teacher.mode_type)}>
                        {getModeLabel(teacher.mode_type)}
                      </Badge>
                      
                      {teacher.location_name && (
                        <div className="text-sm text-muted-foreground">
                          @ {teacher.location_name}
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground min-w-[80px] text-right">
                        {teacher.is_active && teacher.started_at ? (
                          <div>
                            <div>{formatDuration(teacher.session_duration_minutes)}</div>
                            <div className="text-xs">
                              {formatDistanceToNow(new Date(teacher.started_at), { addSuffix: true })}
                            </div>
                          </div>
                        ) : (
                          '--'
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}